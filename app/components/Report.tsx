import * as React from 'react';
import { Container, Header, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
  readonly succeeded: boolean;
  readonly output: string;
  readonly error: string;
}

interface State {
}

export default class Report extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header as="h4">Installation {this.props.succeeded ? 'succeeded' : 'failed'}</Header>
        </Segment>
      </Container>
    );
  }
}
