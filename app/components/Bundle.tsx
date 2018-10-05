import * as React from 'react';
import { Container, Button, Grid, Header, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';

const bundle = require('../../data/bundle.json');

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

export default class Bundle extends React.Component<Properties, {}, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
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
              <Button onClick={() => this.install()}>Install</Button>
            </Grid.Column>
            <Grid.Column>
              <Button>Upgrade</Button>
            </Grid.Column>
            <Grid.Column>
              <Button>Uninstall</Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }

  private install(): void {
    this.props.parent.setState({ action: 'install' });
  }
}
