import * as React from 'react';
import { Container, Header, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
}

export default class Installer extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header sub>Installing all the things</Header>
        </Segment>
      </Container>
    );
  }

  // private async install(): Promise<void> {
  //   const sr = await shell.exec('d:\\GoProjects\\src\\github.com\\deis\\duffle\\bin\\duffle.exe version');
  //   if (succeeded(sr)) {
  //     if (sr.result.code === 0) {
  //       this.setState({ version: sr.result.stdout.trim(), error: null });
  //     } else {
  //       this.setState({ version: null, error: sr.result.stderr.trim() });
  //     }
  //   } else {
  //     this.setState({ version: null, error: sr.error[0] });
  //   }
  // }
}
