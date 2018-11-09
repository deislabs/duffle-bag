import * as React from 'react';
import { Container, Button, Grid, Header, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';
import { findDuffleBinary, BinaryInfo, verifyFile, SignatureVerification } from '../utils/duffle';
import { shell } from '../utils/shell';
import * as embedded from '../utils/embedded';
import { failed, Errorable } from '../utils/errorable';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
}

interface State {
  duffle: 'pending' | BinaryInfo | undefined;
  signingStatus: VerificationUI;
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
    this.state = { duffle: 'pending', signingStatus: { display: SigningStatus.Pending, text: 'Verifying signature...' } };
  }

  async componentDidMount() {
    const duffleBin = await findDuffleBinary(shell);
    this.setState({duffle: duffleBin});
    if (duffleBin) {
      const verifyResult = await embedded.withBundleFile(async (tempFile, isSigned) => {
        if (isSigned) {
          const r = await verifyFile(shell, tempFile);
          return this.signingStatus(r);
        }
        return { display: SigningStatus.Unsigned, text: 'This bundle is not digitally signed.' };
      });
      this.setState({signingStatus: verifyResult});
    } else {
      this.setState({signingStatus: { display: SigningStatus.Error, text: 'Unable to check digital signature: Duffle binary not found' } });
    }
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header sub>Version {embedded.bundle.version}</Header>
          {this.signaturePanel()}
          <Header as="h4" dividing>{embedded.bundle.description || 'No description available'}</Header>
        </Segment>
        <Grid centered columns={3}>
          <Grid.Row>
            <Grid.Column>
              <Button primary onClick={() => this.install()}>Install</Button>
            </Grid.Column>
            <Grid.Column>
              <Button disabled>Upgrade</Button>
            </Grid.Column>
            <Grid.Column>
              <Button disabled>Uninstall</Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Segment raised>
          {this.dufflePanel()}
        </Segment>
      </Container>
    );
  }

  private signaturePanel(): JSX.Element {
    const text = this.state.signingStatus.text;
    switch (this.state.signingStatus.display) {
      case SigningStatus.Error:
        return (<Header sub color='orange'>{text}</Header>);
      case SigningStatus.Failed:
        return (<Header sub color='red'>{text}</Header>);
      case SigningStatus.Verified:
        return (<Header sub>{text}</Header>);
      case SigningStatus.Unsigned:
        return (<Header sub color='grey'>{text}</Header>);
      default:
        return (<Header sub>{text}</Header>);
    }
  }

  private dufflePanel(): JSX.Element {
    if (this.state.duffle) {
      if (this.state.duffle === 'pending') {
        return (<Header sub>Finding Duffle binary...</Header>);
      }
      return (<Header sub>Duffle version {this.state.duffle.version}</Header>);
    }
    return (<Header sub>Duffle not found - cannot install bundle</Header>);
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
    this.props.parent.setState({ action: 'install' });
  }
}
