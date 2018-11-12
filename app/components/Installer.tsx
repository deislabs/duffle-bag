import * as React from 'react';
import { Button, Container, Form, Header, InputOnChangeData, Segment, Label, DropdownProps, Progress, Divider } from 'semantic-ui-react';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { BundleCredential, parseCredentials, CredentialSetEntry, credentialsYAML } from '../utils/credentials';
import * as duffle from '../utils/duffle';
import * as shell from '../utils/shell';
import { failed } from '../utils/errorable';
import * as embedded from '../utils/embedded';
import { withOptionalTempFile } from '../utils/tempfile';

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
  credentialValues: { [key: string]: CredentialSetEntry };
  installProgress: InstallProgress;
  installResult: string;
}

export default class Installer extends React.Component<Properties, State, {}>  {
  private readonly parameterDefinitions: ParameterDefinition[];
  private readonly credentials: BundleCredential[];

  constructor(props: Readonly<Properties>) {
    super(props);

    this.parameterDefinitions = parseParameters(embedded.bundle);
    this.credentials = parseCredentials(embedded.bundle);

    const initialParameterValues = this.parameterDefinitions.map((pd) => ({ [pd.name]: (pd.defaultValue || '').toString() }));
    const ipvObj: { [key: string]: string } = Object.assign({}, ...initialParameterValues);
    const initialCredentialValues = this.credentials.map((c) => this.initialCredential(c));
    const icvObj: { [key: string]: CredentialSetEntry } = Object.assign({}, ...initialCredentialValues);
    this.state = {
      installationName: embedded.bundle.name,
      parameterValues: ipvObj,
      credentialValues: icvObj,
      installProgress: InstallProgress.NotStarted,
      installResult: ''
    };

    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.handleCredentialValueChange = this.handleCredentialValueChange.bind(this);
    this.handleCredentialKindChange = this.handleCredentialKindChange.bind(this);
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

  private handleCredentialKindChange(e: any, c: DropdownProps/* & {name: keyof State}*/) {
    const v = this.state.credentialValues[c.name];
    const newv = Object.assign({}, v, { kind: c.value });
    const n: string = c.name;
    const credentialValues = Object.assign({}, this.state.credentialValues, { [n]: newv });
    this.setState({ credentialValues: credentialValues });
  }

  private handleCredentialValueChange(e: any, c: InputOnChangeData/* & {name: keyof State}*/) {
    const v = this.state.credentialValues[c.name];
    const newv = Object.assign({}, v, { value: c.value });
    const n: string = c.name;
    const credentialValues = Object.assign({}, this.state.credentialValues, { [n]: newv });
    this.setState({ credentialValues: credentialValues });
  }

  private initialCredential(credential: BundleCredential): { [key: string]: CredentialSetEntry } {
    const destKind = credential.env ? 'env' : 'path';
    const destRef = credential.env || credential.path || '';
    return {
      [credential.name]: {
        destinationKind: destKind,
        destinationRef: destRef,
        kind: 'value',
        value: ''
      }
    };
  }

  private get hasCredentials(): boolean {
    return this.credentials && this.credentials.length > 0;
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
    return (
      <Container>
        <Form>
          <Segment raised>
            <Header sub>Install as</Header>
            <Form.Input inline key="installationName" name="installationName" label="Installation name" labelPosition="left" type="text" value={this.state.installationName} onChange={this.handleNameChange} />
          </Segment>
          <Segment raised>
            <Header sub>Installation parameters</Header>
            {...this.parametersUI()}
          </Segment>
          <Segment raised>
            <Header sub>Credentials</Header>
            {this.credentialsUI()}
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

  private parametersUI(): JSX.Element[] {
    if (!this.parameterDefinitions || this.parameterDefinitions.length === 0) {
      return [ (<Label>This bundle does not require any parameters</Label>) ];
    }
    return this.parameterDefinitions.map((pd) => this.inputWidget(pd));
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

  private credentialsUI(): JSX.Element[] {
    if (!this.hasCredentials) {
      return [ (<Label>This bundle does not require any credentials</Label>) ];
    }
    return this.credentials.map((c) => this.credentialWidget(c));
  }

  private credentialWidget(credential: BundleCredential): JSX.Element {
    const opts = ['value', 'env', 'path', 'command'].map((v) => ({ text: v.toString(), value: v.toString() }));
    return (
      <Form.Group inline>
        <Form.Input inline key={credential.name} name={credential.name} label={credential.name} type="text"  value={this.state.credentialValues[credential.name].value} onChange={this.handleCredentialValueChange} />
        <Form.Select inline key={credential.name} name={credential.name} options={opts} value={this.state.credentialValues[credential.name].kind} onChange={this.handleCredentialKindChange} />
      </Form.Group>);
  }

  private async install(): Promise<void> {
    this.setState({ installProgress: InstallProgress.InProgress });
    const credsYAML = this.hasCredentials ? credentialsYAML('temp', this.state.credentialValues) : undefined;
    const result = await withOptionalTempFile(credsYAML, 'yaml', async (credsTempFile) => {
      return await embedded.withBundleFile(async (bundleTempFile, isSigned) => {
        const name = this.state.installationName;
        return await duffle.installFile(shell.shell, bundleTempFile, name, this.state.parameterValues, credsTempFile);
      });
    });
    // TODO: would prefer to install the signed bundle if present.  But this introduces
    // issues of key management.  If we do continue with using the unsigned file, then
    // we may need to pass --insecure to the Duffle CLI.
    if (failed(result)) {
      this.setState({ installProgress: InstallProgress.Failed, installResult: result.error[0] });
      this.props.parent.setState({ action: 'report', state: { succeeded: false, output: '', error: result.error[0] } });
      return;
    }
    this.props.parent.setState({ action: 'report', state: { succeeded: true, output: result.result, error: '' } });
    this.setState({ installProgress: InstallProgress.Succeeded });
  }
}
