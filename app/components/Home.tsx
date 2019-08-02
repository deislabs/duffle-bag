import * as React from 'react';
import { Container, Segment, Header } from 'semantic-ui-react';
import * as cnab from 'cnabjs';

import Bundle from './Bundle';
import Installer from './Installer';
import Report from './Report';

import { Actionable } from './contract';
import * as embedded from '../utils/embedded';
import { failed, Errorable, map } from '../utils/errorable';
import { Eventually, pending } from '../utils/eventually';

interface State {
  readonly bundleManifest: Eventually<Errorable<cnab.Bundle>>;
}

export default class Home extends React.Component<{}, Actionable & State, {}> {
  constructor(props: Readonly<{}>) {
    super(props);
    this.state = { action: null, state: undefined, bundleManifest: { ready: false } };
  }

  async componentDidMount() {
    const bundle = await embedded.bundle;
    const manifest = map(bundle, (b) => b.manifest);
    this.setState({bundleManifest: { ready: true, result: manifest } });
  }

  render() {
    return (
      <Container>
        <Segment>
          <Header as="h2">{this.manifestText()}</Header>
        </Segment>
        {this.body()}
      </Container>
    );
  }

  private manifestText(): string {
    if (pending(this.state.bundleManifest)) {
      return 'Loading bundle...';
    }
    if (failed(this.state.bundleManifest.result)) {
      return "Can't load bundle";  // TODO: might be better to populate this statically then
    }
    return this.state.bundleManifest.result.result.name;
  }

  private body(): JSX.Element {
    if (pending(this.state.bundleManifest) || failed(this.state.bundleManifest.result)) {
      return (<Bundle parent={this} />);
    }
    switch (this.state.action) {
      case 'install':
        return (<Installer parent={this} bundleManifest={this.state.bundleManifest.result.result} />);
      case 'report':
        return (<Report parent={this} bundleManifest={this.state.bundleManifest.result.result} succeeded={this.state.state.succeeded} output={this.state.state.output} error={this.state.state.error} />);
      default:
        return (<Bundle parent={this} />);
    }
  }
}
