import * as React from 'react';
import { Button, Container, Form, Header, InputOnChangeData, Segment, Label, DropdownProps, Progress } from 'semantic-ui-react';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { hasCredentials } from '../utils/credentials';
import * as duffle from '../utils/duffle';
import * as shell from '../utils/shell';
import { failed } from '../utils/errorable';
import { withTempFile } from '../utils/tempfile';

const bundle = require('../../data/bundle.json');

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

enum InstallProgress {
  NotStarted,
  InProgress,
  Succeeded,
  Failed
}

interface State {
  parameterValues: { [key: string]: string };
  installProgress: InstallProgress;
  installResult: string;
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
    this.state = {
      parameterValues: ipvObj,
      installProgress: InstallProgress.NotStarted,
      installResult: ''
    };

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

  private progress(): JSX.Element {
    switch (this.state.installProgress) {
      case InstallProgress.NotStarted:
        return (<Label>Installation not yet started</Label>);
      case InstallProgress.InProgress:
        return (<Progress percent={70} active>Installing</Progress>);
      case InstallProgress.Succeeded:
        return (<Progress percent={100} success>Install complete</Progress>);
      case InstallProgress.Failed:
        return (<Progress percent={100} error>Install failed: {this.state.installResult}</Progress>);
    }
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
          {this.progress()}
        </Segment>
      </Container>
    );
  }

  private inputWidget(pd: ParameterDefinition): JSX.Element {
    if (pd.type === "bool") {
      return this.boolInputWidget(pd);
    }
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

  private boolInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = [true, false].map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name]} onChange={this.handleSelectChange} />);
  }

  private async install(): Promise<void> {
    for (const k of Object.keys(this.state.parameterValues)) {
      console.log(`${k}=${this.state.parameterValues[k]}`);
    }
    this.setState({ installProgress: InstallProgress.InProgress });
    const bundleJSON = JSON.stringify(bundle, undefined, 2);
    const result = await withTempFile(bundleJSON, "json", async (tempFile) => {
      const name = "hellowerble";
      return await duffle.installFile(shell.shell, tempFile, name, this.state.parameterValues, /*credentialSet*/ undefined);
    });
    if (failed(result)) {
      this.setState({ installProgress: InstallProgress.Failed, installResult: result.error[0] });
      return;
    }
    this.setState({ installProgress: InstallProgress.Succeeded });
  }
}
