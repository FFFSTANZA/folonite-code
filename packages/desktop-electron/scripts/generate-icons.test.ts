import { describe, expect, test } from "bun:test"

import {
  ANDROID_ICON_OUTPUTS,
  ANDROID_XML_OUTPUTS,
  ICNS_ICONSET_OUTPUTS,
  ICON_PNG_OUTPUTS,
  IOS_ICON_OUTPUTS,
  WINDOWS_TILE_OUTPUTS,
  createIco,
  getIconSource,
} from "./generate-icons"

describe("icon generation manifest", () => {
  test("covers every icon file used by electron-builder resources", () => {
    expect(ICON_PNG_OUTPUTS).toEqual([
      { path: "32x32.png", size: 32 },
      { path: "64x64.png", size: 64 },
      { path: "128x128.png", size: 128 },
      { path: "128x128@2x.png", size: 256 },
      { path: "dock.png", size: 256 },
      { path: "icon.png", size: 1024 },
    ])

    expect(WINDOWS_TILE_OUTPUTS).toEqual([
      { path: "Square30x30Logo.png", size: 30 },
      { path: "Square44x44Logo.png", size: 44 },
      { path: "StoreLogo.png", size: 50 },
      { path: "Square71x71Logo.png", size: 71 },
      { path: "Square89x89Logo.png", size: 89 },
      { path: "Square107x107Logo.png", size: 107 },
      { path: "Square142x142Logo.png", size: 142 },
      { path: "Square150x150Logo.png", size: 150 },
      { path: "Square284x284Logo.png", size: 284 },
      { path: "Square310x310Logo.png", size: 310 },
    ])

    expect(ANDROID_ICON_OUTPUTS).toEqual([
      { path: "android/mipmap-mdpi/ic_launcher.png", size: 48 },
      { path: "android/mipmap-mdpi/ic_launcher_foreground.png", size: 48 },
      { path: "android/mipmap-mdpi/ic_launcher_round.png", size: 48 },
      { path: "android/mipmap-hdpi/ic_launcher.png", size: 72 },
      { path: "android/mipmap-hdpi/ic_launcher_foreground.png", size: 72 },
      { path: "android/mipmap-hdpi/ic_launcher_round.png", size: 72 },
      { path: "android/mipmap-xhdpi/ic_launcher.png", size: 96 },
      { path: "android/mipmap-xhdpi/ic_launcher_foreground.png", size: 96 },
      { path: "android/mipmap-xhdpi/ic_launcher_round.png", size: 96 },
      { path: "android/mipmap-xxhdpi/ic_launcher.png", size: 144 },
      { path: "android/mipmap-xxhdpi/ic_launcher_foreground.png", size: 144 },
      { path: "android/mipmap-xxhdpi/ic_launcher_round.png", size: 144 },
      { path: "android/mipmap-xxxhdpi/ic_launcher.png", size: 192 },
      { path: "android/mipmap-xxxhdpi/ic_launcher_foreground.png", size: 192 },
      { path: "android/mipmap-xxxhdpi/ic_launcher_round.png", size: 192 },
    ])

    expect(IOS_ICON_OUTPUTS).toEqual([
      { path: "ios/AppIcon-20x20@1x.png", size: 20 },
      { path: "ios/AppIcon-20x20@2x.png", size: 40 },
      { path: "ios/AppIcon-20x20@2x-1.png", size: 40 },
      { path: "ios/AppIcon-20x20@3x.png", size: 60 },
      { path: "ios/AppIcon-29x29@1x.png", size: 29 },
      { path: "ios/AppIcon-29x29@2x.png", size: 58 },
      { path: "ios/AppIcon-29x29@2x-1.png", size: 58 },
      { path: "ios/AppIcon-29x29@3x.png", size: 87 },
      { path: "ios/AppIcon-40x40@1x.png", size: 40 },
      { path: "ios/AppIcon-40x40@2x.png", size: 80 },
      { path: "ios/AppIcon-40x40@2x-1.png", size: 80 },
      { path: "ios/AppIcon-40x40@3x.png", size: 120 },
      { path: "ios/AppIcon-60x60@2x.png", size: 120 },
      { path: "ios/AppIcon-60x60@3x.png", size: 180 },
      { path: "ios/AppIcon-76x76@1x.png", size: 76 },
      { path: "ios/AppIcon-76x76@2x.png", size: 152 },
      { path: "ios/AppIcon-83.5x83.5@2x.png", size: 167 },
      { path: "ios/AppIcon-512@2x.png", size: 1024 },
    ])

    expect(ICNS_ICONSET_OUTPUTS).toEqual([
      { path: "icon_16x16.png", size: 16 },
      { path: "icon_16x16@2x.png", size: 32 },
      { path: "icon_32x32.png", size: 32 },
      { path: "icon_32x32@2x.png", size: 64 },
      { path: "icon_128x128.png", size: 128 },
      { path: "icon_128x128@2x.png", size: 256 },
      { path: "icon_256x256.png", size: 256 },
      { path: "icon_256x256@2x.png", size: 512 },
      { path: "icon_512x512.png", size: 512 },
      { path: "icon_512x512@2x.png", size: 1024 },
    ])

    expect(ANDROID_XML_OUTPUTS).toEqual([
      "android/mipmap-anydpi-v26/ic_launcher.xml",
      "android/values/ic_launcher_background.xml",
    ])
  })

  test("resolves every channel to the shared SVG source for now", () => {
    expect(getIconSource("dev")).toBe("icons/source/icon.svg")
    expect(getIconSource("beta")).toBe("icons/source/icon.svg")
    expect(getIconSource("prod")).toBe("icons/source/icon.svg")
  })
})

describe("createIco", () => {
  test("creates a valid ICO buffer from PNG payloads", () => {
    const smallPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1])
    const largePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 2, 3])

    const ico = createIco([
      { size: 16, png: smallPng },
      { size: 256, png: largePng },
    ])

    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(2)
    expect(ico[6]).toBe(16)
    expect(ico[22]).toBe(0)
    expect(ico.readUInt32LE(14)).toBe(smallPng.length)
    expect(ico.readUInt32LE(18)).toBe(38)
    expect(ico.readUInt32LE(30)).toBe(largePng.length)
    expect(ico.readUInt32LE(34)).toBe(38 + smallPng.length)
    expect(ico.subarray(38, 38 + smallPng.length)).toEqual(smallPng)
    expect(ico.subarray(38 + smallPng.length)).toEqual(largePng)
  })
})
