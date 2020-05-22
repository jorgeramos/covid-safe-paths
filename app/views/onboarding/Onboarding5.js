import React, {useEffect, useState, useContext} from 'react';
import {
  Dimensions,
  ImageBackground,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  checkNotifications,
  request,
  requestNotifications,
} from 'react-native-permissions';
import {SvgXml} from 'react-native-svg';

import {isPlatformiOS} from './../../Util';
import {Icons, Images} from '../../assets';
import {Button} from '../../components/Button';
import {Typography} from '../../components/Typography';
import Colors from '../../constants/colors';
import {PARTICIPATE} from '../../constants/storage';
import {Theme} from '../../constants/themes';
import {config} from '../../COVIDSafePathsConfig';
import {SetStoreData} from '../../helpers/General';
import languages from '../../locales/languages';
import {HCAService} from '../../services/HCAService';
import {sharedStyles} from './styles';
import PermissionsContext from '../../PermissionsContext'

const width = Dimensions.get('window').width;

const PermissionStatusEnum = {
  UNKNOWN: 0,
  GRANTED: 1,
  DENIED: 2,
};

const StepEnum = {
  LOCATION: 0,
  BLUETOOTH: 1,
  NOTIFICATIONS: 2,
  HCA_SUBSCRIPTION: 3,
  DONE: 4,
};


const Onboarding = ({navigation}) => {
  const {
    locationPermission,
    requestLocationPermission,
    bluetoothPermission,
    requestBluetoothPermission} = useContext(PermissionsContext)
  const isGPS = config.tracingStrategy === 'gps'
  const isiOS = isPlatformiOS()

  const [currentStep, setCurrentStep] = useState(
    isGPS ? StepEnum.LOCATION : StepEnum.BLUETOOTH,
  );
  const [notificationPermission, setNotificationPermission] = useState(
    PermissionStatusEnum.UNKNOWN,
  );

  const [authSubscriptionStatus, setAuthSubscriptionStatus] = useState(
    PermissionStatusEnum.UNKNOWN,
  );

  // useEffect(() => {
  //   isGPSTracingStrategy() ? checkLocationStatus() : checkBluetoothStatus();
  //   isPlatformiOS() && checkNotificationStatus();
  //   __DEV__ && isGPSTracingStrategy() && checkSubsriptionStatus();
  // });

  /**
   * Helper method to determine the next step for permission requests.
   * In general there is a linear flow, but because Android does not
   * require permission for notifications, we skip the notifications
   * step on Android.
   *
   * @param {currentStep} StepEnum
   * @returns {StepEnum}
   */
  const getNextStep = currentStep => {
    switch (currentStep) {
      case StepEnum.LOCATION:
        return getLocationNextStep();
      case StepEnum.BLUETOOTH:
        return getBluetoothNextStep();
      case StepEnum.NOTIFICATIONS:
        return __DEV__ && isGPS
          ? StepEnum.HCA_SUBSCRIPTION
          : StepEnum.DONE;
      case StepEnum.HCA_SUBSCRIPTION:
        return StepEnum.DONE;
    }
  };

  const checkLocationStatus = async () => {
    const nextStep = getNextStep(StepEnum.LOCATION);
    const setting = getLocationPermissionSetting();
    const status = await check(setting);

    switch (status) {
      case RESULTS.GRANTED:
        setCurrentStep(nextStep);
        setLocationPermission(PermissionStatusEnum.GRANTED);
        break;
      case RESULTS.BLOCKED:
        setCurrentStep(nextStep);
        setLocationPermission(PermissionStatusEnum.DENIED);
        break;
    }
  };

  const requestLocation = async () => {
    const nextStep = getNextStep(StepEnum.LOCATION);
    const locationPermission = getLocationPermissionSetting();
    requestLocationPermission()
    const status = await request(locationPermission);

    switch (status) {
      case RESULTS.GRANTED:
        setCurrentStep(nextStep);
        break;
      case RESULTS.BLOCKED:
        setCurrentStep(nextStep);
        break;
    }
  };


  const checkNotificationStatus = async () => {
    const nextStep = getNextStep(StepEnum.NOTIFICATIONS);
    const {status} = await checkNotifications();

    switch (status) {
      case RESULTS.GRANTED:
        setCurrentStep(nextStep);
        setNotificationPermission(PermissionStatusEnum.GRANTED);
        break;
      case RESULTS.BLOCKED:
        setCurrentStep(nextStep);
        setNotificationPermission(PermissionStatusEnum.DENIED);
        break;
    }
  };

  const checkSubsriptionStatus = async () => {
    const nextStep = getNextStep(StepEnum.HCA_SUBSCRIPTION);
    const hasUserSetSubscription = await HCAService.hasUserSetSubscription();

    // Only update state if the user has already set their subscription status
    if (hasUserSetSubscription) {
      const isEnabled = await HCAService.isAutosubscriptionEnabled();
      const authSubscriptionStatus = isEnabled
        ? PermissionStatusEnum.GRANTED
        : PermissionStatusEnum.DENIED;

      setCurrentStep(nextStep);
      setAuthSubscriptionStatus(authSubscriptionStatus);
    }
  };

  const getLocationNextStep = () => {
    if (isPlatformiOS()) {
      return StepEnum.NOTIFICATIONS;
    } else if (__DEV__) {
      return StepEnum.HCA_SUBSCRIPTION;
    } else {
      return isPlatformiOS() ? StepEnum.NOTIFICATIONS : StepEnum.DONE;
    }
  };

  const getBluetoothNextStep = () => {
    if (isPlatformiOS()) {
      return StepEnum.NOTIFICATIONS;
    } else {
      return StepEnum.DONE;
    }
  };

  /**
   * Gets the respective location permissions settings string
   * for the user's current device.
   *   */
  const getLocationPermissionSetting = () => {
    return isPlatformiOS()
      ? PERMISSIONS.IOS.LOCATION_ALWAYS
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  };

  // Using dummy permission strings for time being
  // Replace with ExposureNotification Permissions
  const getBluetoothPermissionSetting = () => {
    return isPlatformiOS()
      ? PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL
      : 'android.permission.BLUETOOTH';
  };

  const requestNotification = async () => {
    const nextStep = getNextStep(StepEnum.NOTIFICATIONS);
    const {status} = await requestNotifications(['alert', 'badge', 'sound']);

    switch (status) {
      case RESULTS.GRANTED:
        setCurrentStep(nextStep);
        setNotificationPermission(PermissionStatusEnum.GRANTED);
        break;
      case RESULTS.BLOCKED:
        setCurrentStep(nextStep);
        setNotificationPermission(PermissionStatusEnum.DENIED);
        break;
    }
  };

  const requestHCASubscription = async () => {
    const nextStep = getNextStep(StepEnum.HCA_SUBSCRIPTION);
    await HCAService.enableAutoSubscription();

    setCurrentStep(nextStep),
      setAuthSubscriptionStatus(PermissionStatusEnum.GRANTED);
  };

  /**
   * Allows the user to skip over a given step by setting the
   * permission for that step to `DENIED`
   * @returns {StepEnum}
   */
  const skipCurrentStep = () => {
    const status = PermissionStatusEnum.DENIED;
    const nextStep = getNextStep(currentStep);

    switch (currentStep) {
      case StepEnum.LOCATION:
        setCurrentStep(nextStep);
        // setLocationPermission(status);
        break;
      case StepEnum.BLUETOOTH:
        setCurrentStep(nextStep);
        break;
      case StepEnum.NOTIFICATIONS:
        setCurrentStep(nextStep);
        // setNotificationPermission(status);
        break;
      case StepEnum.HCA_SUBSCRIPTION:
        setCurrentStep(nextStep);
        // setAuthSubscriptionStatus(status);
        break;
    }
  };

  const onButtonPressed = async () => {
    switch (currentStep) {
      case StepEnum.LOCATION:
        requestLocation();
        break;
      case StepEnum.BLUETOOTH:
        requestBluetooth();
        break;
      case StepEnum.NOTIFICATIONS:
        // requestNotification();
        break;
      case StepEnum.HCA_SUBSCRIPTION:
        // requestHCASubscription();
        break;
      case StepEnum.DONE:
        SetStoreData(
          PARTICIPATE,
          locationPermission === PermissionStatusEnum.GRANTED,
        );
        SetStoreData('ONBOARDING_DONE', true);
        navigation.replace('Main');
    }
  };


  const headerThemeStyle = currentStep === StepEnum.DONE ? 'headline1' : 'headline2';
  const subTitleStyle = (currentStep === StepEnum.HCA_SUBSCRIPTION) ? styles.subheaderTextWide : styles.subheaderText
  const buttonText = getButtonText(currentStep)

  return (
    <Theme use='violet'>
      <ImageBackground
        source={Images.LaunchScreenBackground}
        style={styles.backgroundImage}>
        <StatusBar
          barStyle='light-content'
          backgroundColor='transparent'
          translucent
        />

        <View style={styles.mainContainer}>
          <View style={styles.contentContainer}>
            <Title step={currentStep} use={headerThemeStyle} />
            <SubTitle step={currentStep} style={subTitleStyle} />
            {currentStep !== StepEnum.Done ? <SkipStepButton onPress={skipCurrentStep} /> : null}

            <View style={styles.statusContainer}>
              {(isGPS) ? <LocationPermissionQuestion status={locationPermission} />
                : <BluetoothPermissionQuestions status={bluetoothPermission} />}
              {(isiOS) ? <NotificationPermissionQuestion status={notificationPermission} /> : null}
              {(__DEV__) ? <AuthStatusQuestion status={authSubscriptionStatus} /> : null}
              <View style={styles.spacer} />
            </View>

          </View>
        </View>
        <View style={sharedStyles.footerContainer}>
          <Button label={buttonText} onPress={onButtonPressed} />
        </View>
      </ImageBackground>
    </Theme>
  );
};

const Title = ({step, use}) => {
  const getTitleText = () => {
    switch (step) {
      case StepEnum.LOCATION:
        return languages.t('label.launch_header_location');
      case StepEnum.BLUETOOTH:
        return languages.t('label.launch_header_bluetooth');
      case StepEnum.NOTIFICATIONS:
        return languages.t('label.launch_notif_header');
      case StepEnum.HCA_SUBSCRIPTION:
        return languages.t('label.launch_authority_header');
      case StepEnum.DONE:
        return languages.t('label.launch_done_header');
      default:
        return languages.t('label.launch_header_location');
    }
  }

  const text = getTitleText()

  return (
    <Typography style={styles.headerText} use={use} testID='Header'>
      {text}
    </Typography>
  );
};


const SubTitle = ({step, style}) => {
  const getSubTitleText = () => {
    switch (step) {
      case StepEnum.LOCATION:
        return languages.t('label.launch_subheader')
      case StepEnum.BLUETOOTH:
        return languages.t('label.launch_subheader')
      case StepEnum.NOTIFICATIONS:
        return languages.t('label.launch_notif_subheader')
      case StepEnum.HCA_SUBSCRIPTION:
        return languages.t('label.launch_authority_subheader')
      case StepEnum.DONE:
        return languages.t('label.launch_done_subheader')
      default:
        return languages.t('label.launch_subheader')
    }
  }

  const subTitleText = getSubTitleText()

  return (
    <Typography style={style} use={'body3'}>
      {subTitleText}
    </Typography>
  );
};

const SkipStepButton = ({onPress}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Typography style={styles.skipThisStepBtn} use={'body1'}>
        {languages.t('label.skip_this_step')}
      </Typography>
    </TouchableOpacity>
  );
};

const getButtonText = (step) => {
  switch (step) {
    case StepEnum.LOCATION:
      return languages.t('label.launch_enable_location');
    case StepEnum.BLUETOOTH:
      return languages.t('label.launch_enable_bluetooth');
    case StepEnum.NOTIFICATIONS:
      return languages.t('label.launch_enable_notif');
    case StepEnum.HCA_SUBSCRIPTION:
      return languages.t('label.launch_enable_auto_subscription');
    case StepEnum.DONE:
      return languages.t('label.launch_finish_set_up');
  }
};



const LocationPermissionQuestion = ({status}) => {
  return (
    <PermissionButton
      title={languages.t('label.launch_access_location')}
      status={status}
    />
  )
}

const NotificationPermissionQuestion = ({status}) => {
  return (
    <PermissionButton
      title={languages.t('label.launch_notification_access')}
      status={status}
    />
  )
}

const AuthStatusQuestion = ({status}) => {
  return (
    <PermissionButton
      title={languages.t('label.launch_authority_access')}
      status={status}
    />
  )
}

const BluetoothPermissionQuestions = ({status}) => {
  <PermissionButton
    title={languages.t('label.launch_access_bluetooth')}
    status={status}
  />
};

const PermissionButton = ({title, status}) => {
  const getIcon = () => {
    switch (status) {
      case PermissionStatusEnum.UNKNOWN:
        return Icons.PermissionUnknown;
      case PermissionStatusEnum.GRANTED:
        return Icons.PermissionGranted;
      case PermissionStatusEnum.DENIED:
        return Icons.PermissionDenied;
      default:
        return Icons.PermissionUnknown;
    }
  }
  const icon = getIcon()
  return (
    <View>
      <View style={styles.permissionContainer}>
        <Typography style={styles.permissionTitle} use={'body2'}>
          {title}
        </Typography>
        <SvgXml style={styles.permissionIcon} xml={icon} width={30} height={30} />
      </View>
      <View style={styles.divider} />
    </View>
  );
}



const styles = StyleSheet.create({
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  contentContainer: {
    width: width * 0.9,
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  headerText: {
    color: Colors.WHITE,
  },
  subheaderText: {
    color: Colors.WHITE,
    marginTop: '3%',
    width: width * 0.55,
  },
  subheaderTextWide: {
    color: Colors.WHITE,
    marginTop: '3%',
    width: width * 0.8,
  },
  statusContainer: {
    marginTop: '5%',
  },
  divider: {
    backgroundColor: Colors.DIVIDER,
    height: 1,
    marginVertical: '3%',
  },
  spacer: {
    marginVertical: '5%',
  },
  permissionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  permissionTitle: {
    color: Colors.WHITE,
    alignSelf: 'center',
    marginRight: 8,
    flex: 1,
  },
  permissionIcon: {
    alignSelf: 'center',
  },
  skipThisStepBtn: {
    color: Colors.DIVIDER,
    paddingTop: 15,
  },
});

export default Onboarding;
