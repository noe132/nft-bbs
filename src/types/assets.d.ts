// declare module '*.css';
declare module '*.css' {
  const inject: () => unknown;
  export default inject;
}
declare module '*.sass' {
  const inject: () => unknown;
  export default inject;
}
declare module '*.png';
declare module '*.svg' {
  import React from 'react';

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;

  const src: string;

  export default src;
}

declare module '*.svg?react' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.svg?fill' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.svg?fill-icon' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}


declare module '*.svg?icon' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}
