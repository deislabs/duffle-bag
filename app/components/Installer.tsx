import * as React from 'react';
import { Container, Form, Header, Button, Icon, Step, InputOnChangeData, Segment, Label, DropdownProps, Progress, Message } from 'semantic-ui-react';

import { Actionable } from './contract';
import { parseParameters, ParameterDefinition } from '../utils/parameters';
import { BundleCredential, parseCredentials, CredentialSetEntry, credentialsYAML } from '../utils/credentials';
import * as duffle from '../utils/duffle';
import * as shell from '../utils/shell';
import { failed, succeeded } from '../utils/errorable';
import * as embedded from '../utils/embedded';
import { withOptionalTempFile } from '../utils/tempfile';
import { cantHappen } from '../utils/never';
import { project } from '../utils/projection';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

enum InstallProgress {
  NotStarted,
  InProgress,
  Succeeded,
  Failed
}

interface Validity {
  readonly isValid: boolean;
  readonly reason: string;
}

class ParameterValue {
  constructor(readonly definition: ParameterDefinition, readonly text: string) {}

  get validity(): Validity {
    // TODO: embetter
    if (this.definition.type === 'int') {
      const nval = Number.parseInt(this.text);  // TODO: this lets through text that *begins* with any digit
      if (isNaN(nval)) {
        return { isValid: false, reason: 'Must be a number' };
      }
      if (this.definition.minValue !== undefined && nval < this.definition.minValue) {
        return { isValid: false, reason: `Must be at least ${this.definition.minValue}` };
      }
      if (this.definition.maxValue !== undefined && nval > this.definition.maxValue) {
        return { isValid: false, reason: `Must be at most ${this.definition.maxValue}` };
      }
    }
    if (this.definition.type === 'string') {
      const length = this.text.length;
      if (length === undefined) {
        return { isValid: false, reason: 'Must be a string' };
      }
      if (this.definition.minLength !== undefined && length < this.definition.minLength) {
        return { isValid: false, reason: `Must be at least ${this.definition.minLength} characters` };
      }
      if (this.definition.maxLength !== undefined && length > this.definition.maxLength) {
        return { isValid: false, reason: `Must be at most ${this.definition.maxLength} characters` };
      }
    }
    return { isValid: true, reason: '' };
  }
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
  private readonly parameterDefinitions: ParameterDefinition[];
  private readonly credentials: BundleCredential[];

  constructor(props: Readonly<Properties>) {
    super(props);

    this.parameterDefinitions = parseParameters(embedded.bundle);
    this.credentials = parseCredentials(embedded.bundle);

    const initialParameterValues = this.parameterDefinitions.map((pd) => ({ [pd.name]: new ParameterValue(pd, (pd.defaultValue || '').toString()) }));
    const ipvObj: { [key: string]: ParameterValue } = Object.assign({}, ...initialParameterValues);
    const initialCredentialValues = this.credentials.map((c) => this.initialCredential(c));
    const icvObj: { [key: string]: CredentialSetEntry } = Object.assign({}, ...initialCredentialValues);
    this.state = {
      installationName: embedded.bundle.name,
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
    const definition = this.state.parameterValues[c.name].definition;
    const newValue = new ParameterValue(definition, c.value);
    const parameterValues = Object.assign({}, this.state.parameterValues, { [c.name]: newValue });
    this.setState({ parameterValues: parameterValues });
  }

  private handleSelectChange(e: any, c: DropdownProps/* & {name: keyof State}*/) {
    const definition = this.state.parameterValues[c.name].definition;
    const newValue = new ParameterValue(definition, c.value as string);
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

  private async updateInstallationNameExists(name: string) {
    const exists = await duffle.claimExists(shell.shell, name);
    if (succeeded(exists)) {
      this.setState({ installationNameExists: exists.result });
    }
  }

  private progress(): JSX.Element {
    switch (this.state.installProgress) {
      case InstallProgress.Failed:
        return (<Label>Installation not yet started</Label>);
      case InstallProgress.InProgress:
        return (<Progress percent={70} active>Installing</Progress>);
      case InstallProgress.Succeeded:
        return (<Progress percent={100} success>Install complete</Progress>);
      case InstallProgress.NotStarted:
        return (<Progress percent={100} error>Install failed: {this.state.installResult}</Progress>);
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
              <Button secondary left onclick={() => this.goBack()}><Icon name="angle left"></Icon> Cancel </Button>
              {this.progress()}
              <Button primary right onClick={() => this.install()}>Install</Button>
            </Step.Group>
          </Segment>
        </Form>
      </Container>
    );
  }

  private installationNameValidityPanel(): JSX.Element[] {
    if (this.state.installationNameExists === undefined) {
      return [(<Message info>Checking installation name...</Message>)];
    }
    if (this.state.installationNameExists === true) {
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
    if (pd.type === "bool") {
      return this.boolInputWidget(pd);
    }
    if (pd.allowedValues && pd.allowedValues.length > 0) {
      return this.selectInputWidget(pd);
    }
    return this.freeformInputWidget(pd);
  }

  private freeformInputWidget(pd: ParameterDefinition): JSX.Element {
    const validationMessage = this.state.parameterValues[pd.name].validity.isValid ?
      undefined :
      (<Message>{this.state.parameterValues[pd.name].validity.reason}</Message>);
    return (
      <Form.Group inline>
        <Form.Input inline key={pd.name} name={pd.name} label={pd.name} type="text" value={this.state.parameterValues[pd.name].text} error={!this.state.parameterValues[pd.name].validity.isValid} onChange={this.handleInputChange} />
        {validationMessage}
      </Form.Group>);
  }

  private selectInputWidget(pd: ParameterDefinition): JSX.Element {
    const opts = pd.allowedValues!.map((v) => ({ text: v.toString(), value: v.toString() }));
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
    this.props.parent.setState({ action: 'install' });
  }

  private readonly credentialSourceKinds: CredentialSetEntry['kind'][] = ['value', 'env', 'path', 'command'];

  private credentialWidget(credential: BundleCredential): JSX.Element {
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
    this.setState({ installProgress: InstallProgress.InProgress });
    const credsYAML = this.hasCredentials ? credentialsYAML('temp', this.state.credentialValues) : undefined;
    const result = await withOptionalTempFile(credsYAML, 'yaml', async (credsTempFile) => {
      return await embedded.withBundleFile(async (bundleTempFile, isSigned) => {
        const name = this.state.installationName;
        const parameterMap = project(this.state.parameterValues, (pv) => pv.text);
        return await duffle.installFile(shell.shell, bundleTempFile, name, parameterMap, credsTempFile);
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
