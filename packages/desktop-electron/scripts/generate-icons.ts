#!/usr/bin/env bun
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { $ } from "bun"
import sharp from "sharp"

import { resolveChannel, type Channel } from "./utils"

type IconOutput = {
  path: string
  size: number
}

type IcoImage = {
  size: number
  png: Buffer
}

const DEST = "resources/icons"
const SOURCE = "icons/source/icon.svg"

export const ICON_PNG_OUTPUTS: IconOutput[] = [
  { path: "32x32.png", size: 32 },
  { path: "64x64.png", size: 64 },
  { path: "128x128.png", size: 128 },
  { path: "128x128@2x.png", size: 256 },
  { path: "dock.png", size: 256 },
  { path: "icon.png", size: 1024 },
]

export const WINDOWS_TILE_OUTPUTS: IconOutput[] = [
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
]

export const ANDROID_ICON_OUTPUTS: IconOutput[] = [
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
]

export const IOS_ICON_OUTPUTS: IconOutput[] = [
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
]

export const ICNS_ICONSET_OUTPUTS: IconOutput[] = [
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
]

export const ANDROID_XML_OUTPUTS = [
  "android/mipmap-anydpi-v26/ic_launcher.xml",
  "android/values/ic_launcher_background.xml",
]

const ICO_OUTPUTS = [16, 24, 32, 48, 64, 256]

export function getIconSource(_channel: Channel) {
  return SOURCE
}

export function createIco(images: IcoImage[]) {
  const headerSize = 6
  const entrySize = 16
  const directorySize = headerSize + images.length * entrySize
  const totalSize = directorySize + images.reduce((sum, image) => sum + image.png.length, 0)
  const ico = Buffer.alloc(totalSize)

  ico.writeUInt16LE(0, 0)
  ico.writeUInt16LE(1, 2)
  ico.writeUInt16LE(images.length, 4)

  let imageOffset = directorySize
  images.forEach((image, index) => {
    const entryOffset = headerSize + index * entrySize
    const size = image.size >= 256 ? 0 : image.size

    ico[entryOffset] = size
    ico[entryOffset + 1] = size
    ico[entryOffset + 2] = 0
    ico[entryOffset + 3] = 0
    ico.writeUInt16LE(1, entryOffset + 4)
    ico.writeUInt16LE(32, entryOffset + 6)
    ico.writeUInt32LE(image.png.length, entryOffset + 8)
    ico.writeUInt32LE(imageOffset, entryOffset + 12)
    image.png.copy(ico, imageOffset)
    imageOffset += image.png.length
  })

  return ico
}

async function renderPng(source: string, size: number) {
  return sharp(source).resize(size, size).png().toBuffer()
}

async function writePng(source: string, output: IconOutput) {
  const target = path.join(DEST, output.path)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, await renderPng(source, output.size))
}

async function writeXmlFiles() {
  await mkdir(path.join(DEST, "android/mipmap-anydpi-v26"), { recursive: true })
  await mkdir(path.join(DEST, "android/values"), { recursive: true })
  await writeFile(
    path.join(DEST, "android/mipmap-anydpi-v26/ic_launcher.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <background android:drawable="@color/ic_launcher_background"/>
</adaptive-icon>`,
  )
  await writeFile(
    path.join(DEST, "android/values/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#FF7C3A</color>
</resources>`,
  )
}

async function writeIcns(source: string) {
  if (process.platform !== "darwin") return

  const iconset = path.join(DEST, "icon.iconset")
  await rm(iconset, { recursive: true, force: true })
  await mkdir(iconset, { recursive: true })
  for (const output of ICNS_ICONSET_OUTPUTS) {
    await writeFile(path.join(iconset, output.path), await renderPng(source, output.size))
  }
  await $`iconutil -c icns ${iconset} -o ${path.join(DEST, "icon.icns")}`
  await rm(iconset, { recursive: true, force: true })
}

async function writeIco(source: string) {
  const images = await Promise.all(
    ICO_OUTPUTS.map(async (size) => ({
      size,
      png: await renderPng(source, size),
    })),
  )
  await writeFile(path.join(DEST, "icon.ico"), createIco(images))
}

async function generate() {
  const arg = process.argv[2]
  const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()
  const source = getIconSource(channel)
  const outputs = [...ICON_PNG_OUTPUTS, ...WINDOWS_TILE_OUTPUTS, ...ANDROID_ICON_OUTPUTS, ...IOS_ICON_OUTPUTS]

  await rm(DEST, { recursive: true, force: true })
  await mkdir(DEST, { recursive: true })
  await Promise.all(outputs.map((output) => writePng(source, output)))
  await writeXmlFiles()
  await writeIco(source)
  await writeIcns(source)

  console.log(`Generated ${channel} icons from ${source} into ${DEST}`)
}

if (import.meta.main) await generate()
