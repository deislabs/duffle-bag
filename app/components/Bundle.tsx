import * as React from 'react';
import { Container, Button, Grid, Header, Message, Segment } from 'semantic-ui-react';

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
        {this.dufflePanel()}
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
      const paras = description.paragraphs.map((p) => (<p>{p}</p>));
      return { location: 'segment', content: (<Message info>{...paras}</Message>) };
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

// TODO: this seems rude... HTML would be a nicer authoring experience
interface JsonDescription {
  readonly format: 'json';
  readonly paragraphs: string[];
}

interface PlainTextDescription {
  readonly format: 'text';
  readonly text: string;
}

type Description = JsonDescription | PlainTextDescription;

function tryLoadDescription(): Description {
  try {
    const description = require('../../data/description.json');
    if (description && description.paragraphs) {
      return { format: 'json', paragraphs: description.paragraphs };
    }
  } catch {
    // ignore
  }

  return { format: 'text', text: bundle.description || 'No description available' };
}
