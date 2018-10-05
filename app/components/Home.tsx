import * as React from 'react';
import { Container, Segment, Header } from 'semantic-ui-react';

import Bundle from './Bundle';
import Installer from './Installer';

import { Actionable } from './contract';

const bundle = require('../../data/bundle.json');

export default class Home extends React.Component<{}, Actionable, {}> {
  constructor(props: Readonly<{}>) {
    super(props);
    this.state = { action: null };
  }
  render() {
    return (
      <Container style={{ marginTop: '3em' }}>
        <Segment raised>
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
      default:
        return (<Bundle parent={this} />);
    }
  }
}
