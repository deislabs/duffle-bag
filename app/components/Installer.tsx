import * as React from 'react';
import { Container, Form, Header, Button, Icon, Step, InputOnChangeData, Segment, Label, DropdownProps, Progress, Message } from 'semantic-ui-react';
import * as cnab from 'cnabjs';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { NamedCredential, parseCredentials, CredentialSetEntry, credentialsYAML } from '../utils/credentials';
import * as duffle from '../utils/duffle';
import * as shell from '../utils/shell';
import { failed, succeeded, map } from '../utils/errorable';
import * as embedded from '../utils/embedded';
import { withOptionalTempFile, withTempDirectory } from '../utils/tempfile';
import { cantHappen } from '../utils/never';
import { project } from '../utils/projection';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
  readonly bundleManifest: cnab.Bundle;
}

enum InstallProgress {
  NotStarted,
  Starting,
  Importing,
  Installing,
  Succeeded,
  Failed
}

class ParameterValue {
  constructor(readonly parameter: string, readonly text: string) {}
}

interface State {
  installationName: string;
  installationNameExists: boolean | undefined;
  parameterValues: { [key: string]: ParameterValue };
  credentialValues: { [key: string]: CredentialSetEntry };
  installProgress: InstallProgress;
  installResult: string;
}

export default class Installer extends React.Component<Properties, State, {}>  {
  private readonly parameterDefinitions: ReadonlyArray<ParameterDefinition>;
  private readonly credentials: ReadonlyArray<NamedCredential>;
  private readonly validator: cnab.BundleParameterValidator;

  constructor(props: Readonly<Properties>) {
    super(props);

    this.parameterDefinitions = parseParameters(this.props.bundleManifest);
    this.credentials = parseCredentials(this.props.bundleManifest);
    this.validator = cnab.Validator.for(this.props.bundleManifest);

    const initialParameterValues = this.parameterDefinitions.map((pd) => ({ [pd.name]: new ParameterValue(pd.name, (pd.schema.default || '').toString()) }));
    const ipvObj: { [key: string]: ParameterValue } = Object.assign({}, ...initialParameterValues);
    const initialCredentialValues = this.credentials.map((c) => this.initialCredential(c));
    const icvObj: { [key: string]: CredentialSetEntry } = Object.assign({}, ...initialCredentialValues);
    this.state = {
      installationName: this.props.bundleManifest.name,
      installationNameExists: undefined,
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

  async componentDidMount() {
    await this.updateInstallationNameExists(this.state.installationName);
  }

  private async handleNameChange(e: any, c: InputOnChangeData/* & {name: keyof State}*/) {
    this.setState({ installationName: c.value });
    await this.updateInstallationNameExists(c.value);
  }

  private handleInputChange(e: any, c: InputOnChangeData/* & {name: keyof State}*/) {
    const newValue = new ParameterValue(c.name, c.value);
    const parameterValues = Object.assign({}, this.state.parameterValues, { [c.name]: newValue });
    this.setState({ parameterValues: parameterValues });
  }

  private handleSelectChange(e: any, c: DropdownProps/* & {name: keyof State}*/) {
    const newValue = new ParameterValue(c.name, c.value as string);
    const parameterValues = Object.assign({}, this.state.parameterValues, { [c.name]: newValue });
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

  private initialCredential(credential: NamedCredential): { [key: string]: CredentialSetEntry } {
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

  private async updateInstallationNameExists(name: string) {
    const exists = await duffle.claimExists(shell.shell, name);
    if (succeeded(exists)) {
      this.setState({ installationNameExists: exists.result });
    }
  }

  private progress(): JSX.Element {
    switch (this.state.installProgress) {
      case InstallProgress.NotStarted:
        return (<Step className="progress-inactive"><Label>Installation not yet started</Label></Step>);
      case InstallProgress.Starting:
        return (<Step className="progress-active"><Progress percent={10} active>Starting install</Progress></Step>);
      case InstallProgress.Importing:
        return (<Step className="progress-active"><Progress percent={30} active>Importing images</Progress></Step>);
      case InstallProgress.Installing:
        return (<Step className="progress-active"><Progress percent={85} active>Installing</Progress></Step>);
      case InstallProgress.Succeeded:
        return (<Step className="progress-active"><Progress percent={85} success>Install complete</Progress></Step>);
      case InstallProgress.Failed:
        return (<Step className="progress-active"><Progress percent={85} error>Install failed: {this.state.installResult}</Progress></Step>);
    }
  }

  render() {
    return (
      <Container>
        <Form>
          <Segment>
            <Header sub>Install as</Header>
            <Form.Group inline>
              <Form.Input inline key="installationName" name="installationName" label="Installation name" labelPosition="left" type="text" value={this.state.installationName} error={this.state.installationNameExists} onChange={this.handleNameChange} />
            </Form.Group>
            <Form.Group inline>
              {...this.installationNameValidityPanel()}
            </Form.Group>
          </Segment>
          <Segment>
            <Header sub>Installation parameters</Header>
            {...this.parametersUI()}
          </Segment>
          <Segment>
            <Header sub>Credentials</Header>
            {this.credentialsUI()}
          </Segment>
          <Segment>
            <Step.Group>
              <Step>
                {this.goBackButton()}
                <Button primary right onClick={() => this.install()}>Install</Button>
              </Step>
              {this.progress()}
            </Step.Group>
          </Segment>
        </Form>
      </Container>
    );
  }

  goBackButton(): JSX.Element {
    return (<Button secondary left onClick={() => this.goBack()}><Icon name="angle left"></Icon> Back</Button>);
  }

  private installationNameValidityPanel(): JSX.Element[] {
    if (this.state.installationNameExists === undefined) {
      return [(<Message info>Checking installation name...</Message>)];
    }
    if (this.state.installationNameExists) {
      return [(<Message>Name in use</Message>)];  // TODO: for some reason the 'error' option causes it not to show... ETA: it's because error blocks are shown only when the *form* is in an error state
    }
    return [];
  }

  private parametersUI(): JSX.Element[] {
    if (!this.parameterDefinitions || this.parameterDefinitions.length === 0) {
      return [ (<Label>This bundle does not require any parameters</Label>) ];
    }
    return this.parameterDefinitions.map((pd) => this.inputWidget(pd));
  }

  private inputWidget(pd: ParameterDefinition): JSX.Element {
    if (pd.schema.type === 'boolean') {
      return this.boolInputWidget(pd);
    }
    if (pd.schema.enum && pd.schema.enum.length > 0) {
      return this.selectInputWidget(pd);
    }
    return this.freeformInputWidget(pd);
  }

  private freeformInputWidget(pd: ParameterDefinition): JSX.Element {
    const parameterValue = this.state.parameterValues[pd.name];
    const validity = this.validator.validateText(parameterValue.parameter, parameterValue.text);
    const validationMessage = validity.isValid ?
      undefined :
      (<Message>{validity.reason}</Message>);
    return (
      <Form.Group inline>
        <Form.Input inline key={pd.name} name={pd.name} label={pd.name} type="text" value={parameterValue.text} error={!validity.isValid} onChange={this.handleInputChange} />
        {validationMessage}
      </Form.Group>);
  }

  private selectInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = pd.schema.enum!.map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select inline key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name].text} onChange={this.handleSelectChange} />);
  }

  private boolInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = [true, false].map((v) => ({ text: v.toString(), value: v.toString() }));
    return (<Form.Select inline key={pd.name} name={pd.name} label={pd.name} options={opts} value={this.state.parameterValues[pd.name].text} onChange={this.handleSelectChange} />);
  }

  private credentialsUI(): JSX.Element[] {
    if (!this.hasCredentials) {
      return [ (<Label>This bundle does not require any credentials</Label>) ];
    }
    return this.credentials.map((c) => this.credentialWidget(c));
  }

  private goBack(): void {
    this.props.parent.setState({ action: null });
  }

  private readonly credentialSourceKinds: CredentialSetEntry['kind'][] = ['value', 'env', 'path', 'command'];

  private credentialWidget(credential: NamedCredential): JSX.Element {
    // TODO: form items should have unique names - unfortunately the change handlers currently
    // use the sender name to key into the credentials object so probably better to change them
    // to use key or something instead
    const opts = this.credentialSourceKinds.map((v) => ({ text: this.credentialSourceKindText(v), value: v }));
    return (
      <Form.Group inline>
        <Form.Select inline key={credential.name} name={credential.name} options={opts} value={this.state.credentialValues[credential.name].kind} onChange={this.handleCredentialKindChange} />
        <Form.Input inline key={credential.name} name={credential.name} label={credential.name} type="text"  value={this.state.credentialValues[credential.name].value} onChange={this.handleCredentialValueChange} />
      </Form.Group>);
  }

  private credentialSourceKindText(source: CredentialSetEntry['kind']): string {
    switch (source) {
      case 'command':
        return 'Command Output';
      case 'env':
        return 'Environment Variable';
      case 'path':
        return 'File';
      case 'value':
        return 'Value';
      default:
        return cantHappen(source);
    }
  }

  private async install(): Promise<void> {
    this.setState({ installProgress: InstallProgress.Starting });
    const credsYAML = this.hasCredentials ? credentialsYAML('temp', this.state.credentialValues) : undefined;
    const result = await withOptionalTempFile(credsYAML, 'yaml', async (credsTempFile) =>
      await embedded.withFullBundle(async (fullBundleFile) => {
        if (fullBundleFile) {
          const importResult = await withTempDirectory(async (unpackDirectory) => {
            this.setState({ installProgress: InstallProgress.Importing });
            return await duffle.importFile(shell.shell, fullBundleFile, unpackDirectory);
          });
          if (failed(importResult)) {
            return map(importResult, (_) => '');
          }
        }
        return await embedded.withBundleFile(async (bundleTempFile, isSigned) => {
          this.setState({ installProgress: InstallProgress.Installing });
          const name = this.state.installationName;
          const parameterMap = project(this.state.parameterValues, (pv) => pv.text);
          return await duffle.installFile(shell.shell, bundleTempFile, name, parameterMap, credsTempFile);
        });
      })
    );
    // TODO: would prefer to install the signed bundle if present.  But this introduces
    // issues of key management.
    if (failed(result)) {
      this.setState({ installProgress: InstallProgress.Failed, installResult: result.error[0] });
      this.props.parent.setState({ action: 'report', state: { bundleManifest: this.props.bundleManifest, succeeded: false, output: '', error: result.error[0] } });
      return;
    }
    this.props.parent.setState({ action: 'report', state: { bundleManifest: this.props.bundleManifest, succeeded: true, output: result.result, error: '' } });
    this.setState({ installProgress: InstallProgress.Succeeded });
  }
}
