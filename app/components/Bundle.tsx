import * as React from 'react';
import { Container, Card, Header, Message, Step, Segment, Image } from 'semantic-ui-react';
import * as cnab from 'cnabjs';

import { Actionable } from './contract';
import { findDuffleBinary, BinaryInfo, SignatureVerification } from '../utils/duffle';
import { shell } from '../utils/shell';
import * as embedded from '../utils/embedded';
import { failed, Errorable, map, succeeded } from '../utils/errorable';
import { Eventually, pending } from '../utils/eventually';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
  bundleManifest: Eventually<Errorable<cnab.Bundle>>;
  duffle: Eventually<BinaryInfo | undefined>;
  signingStatus: VerificationUI;
  hasFullBundle: boolean | undefined;
}

const VERIFICATION_FAILED_PREFIX = 'Error: verification failed: ';

enum SigningStatus {
  Pending,
  Verified,
  Failed,
  Unsigned,
  Error,
}
interface VerificationUI {
  readonly display: SigningStatus;
  readonly text: string;
}

export default class Bundle extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
    this.state = {
      bundleManifest: { ready: false },
      duffle: { ready: false },
      signingStatus: { display: SigningStatus.Pending, text: 'Verifying signature...' },
      hasFullBundle: undefined
    };
  }

  async componentDidMount() {
    const embeddedBundle = await embedded.bundle;
    const duffleBin = await findDuffleBinary(shell);
    const bundleManifest = map(embeddedBundle, (b) => b.manifest);
    const hasFullBundle = await embedded.hasFullBundle();
    this.setState({
      bundleManifest: { ready: true, result: bundleManifest },
      duffle: { ready: true, result: duffleBin },
      hasFullBundle: hasFullBundle
    });
    if (duffleBin && succeeded(bundleManifest)) {
      const verifyResult = await embedded.withBundleFile(async (tempFile, isSigned) => {
        if (isSigned) {
          return this.signingStatus({ succeeded: false, error: ['Signature format is no longer supported'] });
        }
        return { display: SigningStatus.Unsigned, text: 'This bundle is not digitally signed.' };
      });
      this.setState({signingStatus: verifyResult});
    } else {
      this.setState({signingStatus: { display: SigningStatus.Error, text: 'Unable to check digital signature: Duffle binary not found' } });
    }
  }

  render() {
    const descPanel = this.descriptionPanel();
    return (
      <Container>
        <Segment raised>
          <Header sub>
            <strong>{this.bundleVersion()} &nbsp;</strong> &mdash; {this.thicknessPanel()}.
          </Header>

          <Header sub>{this.signaturePanel()}</Header>
          <hr />
          <Header sub>{descPanel.location === 'header' ? descPanel.content : ''}</Header>
          <Header sub>{descPanel.location === 'segment' ? descPanel.content : ''}</Header>
        </Segment>

        <Card.Group>
          <Card onClick={() => this.install()}>
            <Card.Content>
            <Image src='img/install.svg' />
              <Card.Header>Install</Card.Header>
              <Card.Meta>{this.bundleVersion()}</Card.Meta>
              <Card.Description>
                Run the bundle install steps, as defined by the bundle author.
              </Card.Description>
            </Card.Content>
          </Card>

          {/* <Card>
            <Card.Content>
            <Image src='img/upgrade.svg' />
            <Card.Header>Upgrade</Card.Header>
              <Card.Meta>No install detected.</Card.Meta>
              <Card.Description>
                Run upgrade steps on an active bundle.
              </Card.Description>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
            <Image src='img/uninstall.svg' />
            <Card.Header>Uninstall</Card.Header>
              <Card.Meta>No install detected.</Card.Meta>
              <Card.Description>
              Run the uninstall steps, as defined by the bundle author.
              </Card.Description>
            </Card.Content>
          </Card> */}

        </Card.Group>

        <Segment>
          <Step.Group>
            <Step>
              {this.dufflePanel()}
            </Step>
          </Step.Group>
        </Segment>

      </Container>
    );
  }

  private bundleVersion(): string {
    if (pending(this.state.bundleManifest)) {
      return 'Loading bundle details...';
    }
    if (succeeded(this.state.bundleManifest.result)) {
      return `Version ${this.state.bundleManifest.result.result.version}`;
    }
    return `Can't load bundle: ${this.state.bundleManifest.result.error[0]}`;
  }

  private bundleDescription(): string | undefined {
    if (pending(this.state.bundleManifest)) {
      return 'Loading bundle description...';
    }
    if (succeeded(this.state.bundleManifest.result)) {
      return this.state.bundleManifest.result.result.description;
    }
    return '';
  }

  private signaturePanel(): JSX.Element {
    const text = this.state.signingStatus.text;
    switch (this.state.signingStatus.display) {
      case SigningStatus.Error:
        return (<span color='orange'>{text}</span>);
      case SigningStatus.Failed:
        return (<span color='red'>{text}</span>);
      case SigningStatus.Verified:
        return (<span color='green'>{text}</span>);
      case SigningStatus.Unsigned:
        return (<span>{text}</span>);
      default:
        return (<span>{text}</span>);
    }
  }

  private thicknessPanel(): JSX.Element {
    if (this.state.hasFullBundle === undefined) {
      return (<span>Checking bundle type...</span>);
    }
    if (this.state.hasFullBundle) {
      return (<span>This installer contains all required images and can be run offline</span>);
    }
    return (<span>This installer will download any required images from the network</span>);
  }

  private dufflePanel(): JSX.Element {
    if (pending(this.state.duffle)) {
      return (<Message info>Finding Duffle binary...</Message>);
    }
    if (this.state.duffle.result) {
      return (<Message info>Duffle version {this.state.duffle.result.version}</Message>);
    }
    return (<Message error>Duffle not found - cannot install bundle</Message>);
  }

  private descriptionPanel(): { location: 'header' | 'segment', content: JSX.Element } {
    const description = this.tryLoadDescription();
    if (description.format === 'text') {
      return { location: 'header', content: (<Header as="h4">{description.text}</Header>) };
    } else {
      return { location: 'segment', content: (<Message info><div dangerouslySetInnerHTML={{__html: description.text}} /></Message>) };
    }
  }

  private tryLoadDescription(): Description {
    try {
      const description = require('../../data/description.html');
      if (description) {
        return { format: 'html', text: description };
      }
    } catch {
      // ignore
    }

    return { format: 'text', text: this.bundleDescription() || 'No description available' };
  }

  private signingStatus(r: Errorable<SignatureVerification>): VerificationUI {
    if (failed(r)) {
      return { display: SigningStatus.Error, text: `Unable to check digital signature: ${r.error[0]}` };
    }
    if (r.result.verified) {
      return { display: SigningStatus.Verified, text: r.result.signer };
    }
    if (r.result.reason.startsWith(VERIFICATION_FAILED_PREFIX)) {
      const reason = r.result.reason.substring(VERIFICATION_FAILED_PREFIX.length);
      return { display: SigningStatus.Failed, text: `Digital signature failed verification: ${reason}` };
    } else {
      return { display: SigningStatus.Failed, text: `Digital signature failed verification: ${r.result.reason}` };
    }
  }

  private install(): void {
    this.props.parent.setState({ action: 'install', state: { bundleManifest: this.state.bundleManifest! } });
  }
}

interface Description {
  readonly format: 'html' | 'text';
  readonly text: string;
}
