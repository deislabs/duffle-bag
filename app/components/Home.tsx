import * as React from 'react';
import { Container, Segment, Header } from 'semantic-ui-react';

import Bundle from './Bundle';
import Installer from './Installer';
import Report from './Report';

import { Actionable } from './contract';

const bundle = require('../../data/bundle.json');

export default class Home extends React.Component<{}, Actionable, {}> {
  constructor(props: Readonly<{}>) {
    super(props);
    this.state = { action: null, state: undefined };
  }
  render() {
    return (
      <Container>
        <Segment>
          <Header as="h2">{bundle.name}</Header>
        </Segment>
        {this.body()}
      </Container>
    );
  }

  private body(): JSX.Element {
    switch (this.state.action) {
      case 'install':
        return (<Installer parent={this} />);
      case 'report':
        return (<Report parent={this} succeeded={this.state.state.succeeded} output={this.state.state.output} error={this.state.state.error} />);
      default:
        return (<Bundle parent={this} />);
    }
  }
}
