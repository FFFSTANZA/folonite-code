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

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <FoloniteMarkShape fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: { ref?: (el: HTMLDivElement) => void; class?: string }) => {
  return (
    <div
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <img src="/Folonite-logo.png" alt="Folonite" class="w-24 h-auto" />
    </div>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <img
      src="/Folonite-logo.png"
      alt="Folonite"
      data-component="logo"
      classList={{ [props.class ?? ""]: !!props.class }}
    />
  )
}
