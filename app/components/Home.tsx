import * as React from 'react';
import { Container, Segment, Header } from 'semantic-ui-react';

import Bundle from './Bundle';
import Installer from './Installer';
import Report from './Report';

import { Actionable } from './contract';
import { BundleManifest } from '../utils/duffle.objectmodel';
import * as embedded from '../utils/embedded';
import { failed } from '../utils/errorable';

interface State {
  readonly bundleManifest: 'pending' | BundleManifest | undefined;
}

export default class Home extends React.Component<{}, Actionable & State, {}> {
  constructor(props: Readonly<{}>) {
    super(props);
    this.state = { action: null, state: undefined, bundleManifest: 'pending' };
  }

  async componentDidMount() {
    const bundle = await embedded.bundle;
    if (failed(bundle)) {
      this.setState({bundleManifest: undefined});
      return;
    }
    this.setState({bundleManifest: bundle.result.manifest});
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
    if (this.state.bundleManifest === 'pending') {
      return 'Loading bundle...';
    }
    if (this.state.bundleManifest === undefined) {
      return "Can't load bundle";  // TODO: might be better to populate this statically then
    }
    return this.state.bundleManifest.name;
  }

  private body(): JSX.Element {
    switch (this.state.action) {
      case 'install':
        return (<Installer parent={this} bundleManifest={this.state.state.bundleManifest} />);
      case 'report':
        return (<Report parent={this} bundleManifest={this.state.state.bundleManifest} succeeded={this.state.state.succeeded} output={this.state.state.output} error={this.state.state.error} />);
      default:
        return (<Bundle parent={this} />);
    }
  }
}
