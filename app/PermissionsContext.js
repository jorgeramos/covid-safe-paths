import React, {useEffect, useState, createContext} from "react"
import {Rationale, Platform} from "react-native"
import {
  PERMISSIONS,
  request,
  PermissionStatus,
  Permission,
} from "react-native-permissions"

import {config} from './COVIDSafePathsConfig'

const PermissionStatusEnum = {
  UNKNOWN: 0,
  GRANTED: 1,
  DENIED: 2,
};

const PermissionsContext = createContext({
  hasLocationPermissionGranted: false,
  requestPermission: () => {},
})

const PermissionsProvider = ({children}) => {
  const {tracingStrategy} = config
  const [
    locationPermission,
    setLocationPermission,
  ] = useState(PermissionStatusEnum.UNKNOWN)

  const [
    bluetoothPermission,
    setBluetoothPermission,
  ] = useState(PermissionStatusEnum.UNKNOWN)

  const isGPS = tracingStrategy === "gps"

  useEffect(() => {
    if (isGPS) {
      requestLocationPermission()
    } else {
      // checkBluetoothStatus();
    }

    if (Platform.OS === "ios") {
      // checkNotificationStatus();
    }

    if (__DEV__ && isGPS) {
      // checkSubsriptionStatus();
    }
  });


  // const locationWhenInUseRationale = {
  //   title: strings.title,
  //   message: strings.message,
  //   buttonPositive: strings.buttonPositive,
  //   buttonNegative: strings.buttonNegative,
  //   buttonNeutral: strings.buttonNeutral,
  // }

  const requestLocationPermission = () => {
    if (Platform.OS === "ios") {
      requestLocationForPlatform(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)
    } else if (Platform.OS === "android") {
      requestLocationForPlatform(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
    }
  }

  const requestLocationForPlatform = (permission) => {
    request(permission, locationWhenInUseRationale).then(
      (result) => {
        switch (result) {
          case "unavailable": {
            setLocationPermission(PermissionStatusEnum.UNKNOWN)
            break;
          }
          case "denied": {
            setLocationPermission(PermissionStatusEnum.DENIED)
            break;
          }
          case "blocked": {
            setLocationPermission(PermissionStatusEnum.DENIED)
            break;
          }
          case "granted": {
            setLocationPermission(PermissionStatus.GRANTED)
            break;
          }
          default: {
            setLocationPermission(PermissionStatusEnum.UNKNOWN)
            break;
          }

        }
      }
    )
  }

  const requestBluetoothPermission = () => {}

  return (
    <PermissionsContext.Provider
      value={{
        locationPermission,
        requestLocationPermission,
        bluetoothPermission,
        requestBluetoothPermission
      }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export {PermissionsProvider}
export default PermissionsContext
