import * as React from 'react';
import Bundle from './Bundle';
import { Container, Segment, Header } from 'semantic-ui-react';

const bundle = require('../../data/bundle.json');

export default class Home extends React.Component {
  render() {
    return (
      <Container style={{ marginTop: '3em' }}>
        <Segment raised>
          <Header as="h2">{bundle.name}</Header>
        </Segment>
        <Bundle />
      </Container>
    );
  }
}
