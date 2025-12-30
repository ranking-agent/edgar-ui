declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  import Cytoscape from 'cytoscape';

  interface CytoscapeComponentProps {
    elements: any[];
    stylesheet?: any[];
    layout?: any;
    cy?: (cy: any) => void;
    style?: React.CSSProperties;
    [key: string]: any;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}
