import * as React from 'react';
import { Container, Card, Header, Message, Step, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';
import { findDuffleBinary, BinaryInfo, verifyFile, SignatureVerification } from '../utils/duffle';
import { shell } from '../utils/shell';
import * as embedded from '../utils/embedded';
import { failed, Errorable } from '../utils/errorable';

const description = tryLoadDescription();

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
    const descPanel = this.descriptionPanel();
    return (
      <Container>
        <Segment raised>
          <Header sub>Version {embedded.bundle.version}</Header>
          {this.signaturePanel()}
          {descPanel.location === 'header' ? descPanel.content : ''}
        </Segment>
        {descPanel.location === 'segment' ? descPanel.content : ''}

        <Card.Group>
          <Card onClick={() => this.install()}>
            <Card.Content>
              <Card.Header>Install</Card.Header>
              <Card.Meta>Friends of Elliot</Card.Meta>
              <Card.Description>
                Steve wants to add you to the group <strong>best friends</strong>
              </Card.Description>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <Card.Header>Upgrade</Card.Header>
              <Card.Meta>Friends of Elliot</Card.Meta>
              <Card.Description>
                Steve wants to add you to the group <strong>best friends</strong>
              </Card.Description>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <Card.Header>Uninstall</Card.Header>
              <Card.Meta>Friends of Elliot</Card.Meta>
              <Card.Description>
                Steve wants to add you to the group <strong>best friends</strong>
              </Card.Description>
            </Card.Content>
          </Card>

        </Card.Group>

        <Segment>
          <Step.Group>
            {this.dufflePanel()}
          </Step.Group>
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
        return (<Message info>Finding Duffle binary...</Message>);
      }
      return (<Message info>Duffle version {this.state.duffle.version}</Message>);
    }
    return (<Message error>Duffle not found - cannot install bundle</Message>);
  }

  private descriptionPanel(): { location: 'header' | 'segment', content: JSX.Element } {
    if (description.format === 'text') {
      return { location: 'header', content: (<Header as="h4">{description.text}</Header>) };
    } else {
      return { location: 'segment', content: (<Message info><div dangerouslySetInnerHTML={{__html: description.text}} /></Message>) };
    }
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

interface Description {
  readonly format: 'html' | 'text';
  readonly text: string;
}

function tryLoadDescription(): Description {
  try {
    const description = require('../../data/description.html');
    if (description) {
      return { format: 'html', text: description };
    }
  } catch {
    // ignore
  }

  return { format: 'text', text: embedded.bundle.description || 'No description available' };
}
