import * as React from 'react';
import { Container, Button, Grid, Header, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';
import { findDuffleBinary, BinaryInfo } from '../utils/duffle';
import { shell } from '../utils/shell';

const bundle = require('../../data/bundle.json');

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
  duffle: 'pending' | BinaryInfo | undefined;
}

export default class Bundle extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
    this.state = { duffle: 'pending' };
  }

  async componentDidMount() {
    this.setState({duffle: await findDuffleBinary(shell)});
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header sub>Version {bundle.version}</Header>
          <Header as="h4" dividing>{bundle.description || 'No description available'}</Header>
        </Segment>
        <Grid centered columns={3}>
          <Grid.Row>
            <Grid.Column>
              <Button primary onClick={() => this.install()}>Install</Button>
            </Grid.Column>
            <Grid.Column>
              <Button disabled>Upgrade</Button>
            </Grid.Column>
            <Grid.Column>
              <Button disabled>Uninstall</Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Segment raised>
          {this.dufflePanel()}
        </Segment>
      </Container>
    );
  }

  private dufflePanel(): JSX.Element {
    if (this.state.duffle) {
      if (this.state.duffle === 'pending') {
        return (<Header sub>Finding Duffle binary...</Header>);
      }
      return (<Header sub>Duffle version {this.state.duffle.version}</Header>);
    }
    return (<Header sub>Duffle not found - cannot install bundle</Header>);
  }

  private install(): void {
    this.props.parent.setState({ action: 'install' });
  }
}
