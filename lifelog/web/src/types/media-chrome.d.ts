import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "media-controller": ElementProps & { audio?: string };
      "media-control-bar": ElementProps;
      "media-play-button": ElementProps;
      "media-time-range": ElementProps;
      "media-time-display": ElementProps;
    }
  }
}
