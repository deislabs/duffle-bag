import * as React from 'react';
import { Button, Container, Form, Header, InputOnChangeData, Segment, Label, DropdownProps } from 'semantic-ui-react';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { hasCredentials } from '../utils/credentials';

const bundle = require('../../data/bundle.json');

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
  parameterValues: { [key: string]: string };
}

export default class Installer extends React.Component<Properties, State, {}>  {
  private readonly parameterDefinitions: ParameterDefinition[];
  private readonly hasCredentials: boolean;

  constructor(props: Readonly<Properties>) {
    super(props);

    this.parameterDefinitions = parseParameters(bundle);
    this.hasCredentials = hasCredentials(bundle);

    const initialParameterValues = this.parameterDefinitions.map((pd) => ({ [pd.name]: (pd.defaultValue || '').toString() }));
    const ipvObj: { [key: string]: string } = Object.assign({}, ...initialParameterValues);
    this.state = { parameterValues: ipvObj };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  private handleInputChange(e: any, c: InputOnChangeData/* & {name: keyof State}*/) {
    const parameterValues = Object.assign({}, this.state.parameterValues, { [c.name]: c.value });
    this.setState({ parameterValues: parameterValues });
  }

  private handleSelectChange(e: any, c: DropdownProps/* & {name: keyof State}*/) {
    const parameterValues = Object.assign({}, this.state.parameterValues, { [c.name]: c.value });
    this.setState({ parameterValues: parameterValues });
  }

  render() {
    const credentialsUI = this.hasCredentials ? (<Label>You need credentials</Label>) : (<Label>This bundle does not require any credentials</Label>);
    const parameterUIs = this.parameterDefinitions.map((pd) => this.inputWidget(pd));

    return (
      <Container>
        <Segment raised>
          <Header sub>Installation parameters</Header>
          <Form>
            {...parameterUIs}
            {credentialsUI}
          </Form>
          <Button onClick={() => this.install()}>Install</Button>
        </Segment>
      </Container>
    );
  }

  private inputWidget(pd: ParameterDefinition): JSX.Element {
    if (pd.allowedValues && pd.allowedValues.length > 0) {
      return this.selectInputWidget(pd);
    }
    return this.freeformInputWidget(pd);
  }

  private freeformInputWidget(pd: ParameterDefinition): JSX.Element {
    return (<Form.Input key={pd.name} name={pd.name} label={pd.name} type="text" value={this.state.parameterValues[pd.name]} onChange={this.handleInputChange} />);
  }

  private selectInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = pd.allowedValues!.map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name]} onChange={this.handleSelectChange} />);
  }

  private async install(): Promise<void> {
    for (const k of Object.keys(this.state.parameterValues)) {
      console.log(`${k}=${this.state.parameterValues[k]}`);
    }
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
