import * as React from 'react';
import { Button, Container, Form, Header, Input, InputOnChangeData, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
  port: number;
}

export default class Installer extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
    this.state = { port: 8080 };

    this.handleInputChange = this.handleInputChange.bind(this);
    //this.handleSubmit = this.handleSubmit.bind(this);
  }

  private handleInputChange(e: any, c: InputOnChangeData & {name: keyof State}) {
    console.log(e);
    console.log(c);
    this.setState({ [c.name]: Number.parseInt(c.value) });
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header sub>Installation parameters</Header>
          <Form>
            <Form.Field name="port" control={Input} label="Port" type="number" value={this.state.port} onChange={this.handleInputChange} />
          </Form>
          <Button onClick={() => this.install()}>Install</Button>
        </Segment>
      </Container>
    );
  }

  private async install(): Promise<void> {
    console.log(this.state.port);
    // const sr = await shell.exec('d:\\GoProjects\\src\\github.com\\deis\\duffle\\bin\\duffle.exe version');
    // if (succeeded(sr)) {
    //   if (sr.result.code === 0) {
    //     this.setState({ version: sr.result.stdout.trim(), error: null });
    //   } else {
    //     this.setState({ version: null, error: sr.result.stderr.trim() });
    //   }
    // } else {
    //   this.setState({ version: null, error: sr.error[0] });
    // }
  }
}
