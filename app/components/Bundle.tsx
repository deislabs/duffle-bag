import * as React from 'react';
import { Container, Button, Grid /*, Header, Icon, Label */, Segment, Step /*, TextArea */ } from 'semantic-ui-react';

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
    this.setState({version: null, error: null});
  }

  private statusText(): string {
    if (!this.state) {
      return 'it clicks us the button or us gives it the hose again';
    }
    return this.state.version || this.state.error || 'wtf';
  }

  render() {
    return (
      <Container>
        <Segment raised style={{height: '96px', overflow: 'auto'}}>
          {bundle.name}
        </Segment>
        <Segment raised style={{height: '96px', overflow: 'auto'}}>
          {this.statusText()}
        </Segment>

        <Grid centered>
          <Step.Group>
            <Step disabled>
              <Step.Content>
                <Button onClick={() => this.install()}>Install</Button>
              </Step.Content>
            </Step>
            <Step disabled>
              <Step.Content>
                <Button>Upgrade</Button>
              </Step.Content>
            </Step>
            <Step disabled>
              <Step.Content>
                <Button>Uninstall</Button>
              </Step.Content>
            </Step>
          </Step.Group>
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
