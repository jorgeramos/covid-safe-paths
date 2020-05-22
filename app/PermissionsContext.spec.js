import React, {useContext} from "react"
import {Text, PermissionStatus} from "react-native"
import {cleanup, render, wait} from "@testing-library/react-native"
import "@testing-library/jest-native/extend-expect"

import PermissionsContext, {PermissionsProvider} from "./PermissionsContext"

afterEach(cleanup)

const renderPermissionsProvider = () => {
  const TextPermissionsConsumer = () => {
    const {hasLocationPermissionGranted, requestPermission} = useContext(
      PermissionsContext
    )
    requestPermission()
    return (
      <Text testID={"location-permission"}>
        {hasLocationPermissionGranted.toString()}
      </Text>
    )
  }

  return render(
    <PermissionsProvider>
      <TextPermissionsConsumer />
    </PermissionsProvider>
  )
}

let mockPermission: PermissionStatus = "denied"
jest.mock("react-native-permissions", () => {
  return {
    PERMISSIONS: {
      IOS: {
        LOCATION_WHEN_IN_USE: "ios.permissions.LOCATION_WHEN_IN_USE",
      },
    },
    request: () => {
      return new Promise(resolve => {
        resolve(mockPermission)
      })
    },
  }
})

describe("PermissionsProvider", () => {
  describe("when the user has the permission set to granted", () => {
    test("it provides true for the state of location permissions", async () => {
      mockPermission = "granted"

      const {getByTestId} = renderPermissionsProvider()

      await wait()

      expect(getByTestId("location-permission")).toHaveTextContent("true")
    })
  })

  describe("when the user has the permssion set to denined", () => {
    test("it provides false for the state of the permission", async () => {
      mockPermission = "denied"

      const {getByTestId} = renderPermissionsProvider()

      await wait()

      expect(getByTestId("location-permission")).toHaveTextContent("false")
    })
  })
})
