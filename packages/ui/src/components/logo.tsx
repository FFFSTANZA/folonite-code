import { ComponentProps } from "solid-js"

const FoloniteMarkShape = (props: { fill: string }) => {
  return (
    <g fill={props.fill}>
      <path d="M32 4 L58 18 V46 L32 60 L6 46 V18 Z" fill-opacity="0.15" />
      <path
        d="M32 4 L58 18 V46 L32 60 L6 46 V18 Z"
        stroke={props.fill}
        stroke-width="3.5"
        stroke-linejoin="round"
      />
      <path d="M32 4 V32 L58 18 M32 32 L58 46 M32 32 L32 60 M32 32 L6 46 M32 32 L6 18" stroke={props.fill} stroke-width="2" stroke-linecap="round" />
    </g>
  )
}

export const FoloniteIconSVG = (props: { class?: string }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <path
        d="M20 12C20 10.8954 20.8954 10 22 10H44C45.1046 10 46 10.8954 46 12V18C46 19.1046 45.1046 20 44 20H22C20.8954 20 20 19.1046 20 18V12Z"
        fill="currentColor"
      />
      <path
        d="M20 26C20 24.8954 20.8954 24 22 24H38C39.1046 24 40 24.8954 40 26V32C40 33.1046 39.1046 34 38 34H22C20.8954 34 20 33.1046 20 32V26Z"
        fill="currentColor"
      />
      <path
        d="M20 40C20 38.8954 20.8954 38 22 38H26C27.1046 38 28 38.8954 28 40V52C28 53.1046 27.1046 54 26 54H22C20.8954 54 20 53.1046 20 52V40Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const Mark = (props: { class?: string }) => {
  return (
    <div
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      class="rounded-lg overflow-hidden bg-white shadow-sm"
    >
      <img src="/Folonite-logo.png" alt="Folonite Mark" class="w-full h-full object-contain" />
    </div>
  )
}

export const Splash = (props: { ref?: (el: HTMLDivElement) => void; class?: string }) => {
  return (
    <div
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      class="rounded-2xl overflow-hidden bg-white shadow-md p-1"
    >
      <img src="/Folonite-logo.png" alt="Folonite" class="w-20 h-20 object-contain" />
    </div>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <div
      data-component="logo-container"
      classList={{ [props.class ?? ""]: !!props.class }}
      class="rounded-2xl overflow-hidden bg-white shadow-md p-1 w-fit mx-auto"
    >
      <img
        src="/Folonite-logo.png"
        alt="Folonite"
        data-component="logo"
        class="w-16 h-16 object-contain"
      />
    </div>
  )
}
