import * as React from 'react';
import { Button, Container, Form, Header, InputOnChangeData, Segment, Label, DropdownProps, Progress, Divider } from 'semantic-ui-react';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { hasCredentials } from '../utils/credentials';
import * as duffle from '../utils/duffle';
import * as shell from '../utils/shell';
import { failed } from '../utils/errorable';
import * as embedded from '../utils/embedded';

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
  installationName: string;
  parameterValues: { [key: string]: string };
  installProgress: InstallProgress;
  installResult: string;
}

export default class Installer extends React.Component<Properties, State, {}>  {
  private readonly parameterDefinitions: ParameterDefinition[];
  private readonly hasCredentials: boolean;

  constructor(props: Readonly<Properties>) {
    super(props);

    this.parameterDefinitions = parseParameters(embedded.bundle);
    this.hasCredentials = hasCredentials(embedded.bundle);

    const initialParameterValues = this.parameterDefinitions.map((pd) => ({ [pd.name]: (pd.defaultValue || '').toString() }));
    const ipvObj: { [key: string]: string } = Object.assign({}, ...initialParameterValues);
    this.state = {
      installationName: embedded.bundle.name,
      parameterValues: ipvObj,
      installProgress: InstallProgress.NotStarted,
      installResult: ''
    };

    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  private handleNameChange(e: any, c: InputOnChangeData/* & {name: keyof State}*/) {
    this.setState({ installationName: c.value });
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
        <Form>
          <Segment raised>
            <Header sub>Install as</Header>
            <Form.Input inline key="installationName" name="installationName" label="Installation name" labelPosition="left" type="text" value={this.state.installationName} onChange={this.handleNameChange} />
          </Segment>
          <Segment raised>
            <Header sub>Installation parameters</Header>
            {...parameterUIs}
          </Segment>
          <Segment raised>
            <Header sub>Credentials</Header>
            {credentialsUI}
          </Segment>
          <Segment raised>
            <div><Button primary onClick={() => this.install()}>Install</Button></div>
            <Divider />
            {this.progress()}
          </Segment>
        </Form>
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
    return (<Form.Input inline key={pd.name} name={pd.name} label={pd.name} type="text" value={this.state.parameterValues[pd.name]} onChange={this.handleInputChange} />);
  }

  private selectInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = pd.allowedValues!.map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select inline key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name]} onChange={this.handleSelectChange} />);
  }

  private boolInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = [true, false].map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select inline key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name]} onChange={this.handleSelectChange} />);
  }

  private async install(): Promise<void> {
    this.setState({ installProgress: InstallProgress.InProgress });
    // TODO: would prefer to install the signed bundle if present.  But this introduces
    // issues of key management.  If we do continue with using the unsigned file, then
    // we may need to pass --insecure to the Duffle CLI.
    // TODO: still having trouble even loading embedded files, possibly due to webpack.
    const result = await embedded.withBundleFile(async (tempFile, isSigned) => {
      const name = this.state.installationName;
      return await duffle.installFile(shell.shell, tempFile, name, this.state.parameterValues, /*credentialSet*/ undefined);
    });
    if (failed(result)) {
      this.setState({ installProgress: InstallProgress.Failed, installResult: result.error[0] });
      return;
    }
    this.setState({ installProgress: InstallProgress.Succeeded });
  }
}
