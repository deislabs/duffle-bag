import * as React from 'react';
import { Container, Button, Grid, Header, Label, Segment } from 'semantic-ui-react';

import { shell } from '../utils/shell';
import { succeeded } from '../utils/errorable';

const bundle = require('../../data/bundle.json');

interface State {
  readonly version: string | null;
  readonly error: string | null;
}

export default class Bundle extends React.Component<{}, State, {}>  {
  constructor(props: Readonly<{}>) {
    super(props);
    this.state = {version: null, error: null};
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header sub>Version {bundle.version}</Header>
          <Header as="h4" dividing>{bundle.description || 'No description available'}</Header>
          <Label>Duffle version = {this.state.version || this.state.error || 'wtf'}</Label>
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

  private async install(): Promise<void> {
    const sr = await shell.exec('d:\\GoProjects\\src\\github.com\\deis\\duffle\\bin\\duffle.exe version');
    if (succeeded(sr)) {
      if (sr.result.code === 0) {
        this.setState({ version: sr.result.stdout.trim(), error: null });
      } else {
        this.setState({ version: null, error: sr.result.stderr.trim() });
      }
    } else {
      this.setState({ version: null, error: sr.error[0] });
    }
  }
}
