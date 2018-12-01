import * as React from 'react';
import { Button, Container, Header, Message, Segment, Step, Icon } from 'semantic-ui-react';

import { Actionable } from './contract';
import { BundleManifest } from '../utils/duffle.objectmodel';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
  readonly bundleManifest: BundleManifest;
  readonly succeeded: boolean;
  readonly output: string;
  readonly error: string;
}

interface State {
}

interface PostInstallItem {
  readonly html?: string;
}

export default class Report extends React.Component<Properties, State, {}>  {
  constructor(props: Readonly<Properties>) {
    super(props);
  }

  render() {
    return (
      <Container>
        <Segment raised>
          <Header as="h3">Installation {this.props.succeeded ? 'succeeded' : 'failed'}.</Header>

          <p>{this.outputPanel()}</p>
          <p>{this.errorPanel()}</p>
        </Segment>
        <Segment raised>
          <Step.Group>
            <Button secondary left onclick={() => this.goBack()}><Icon name="angle left"></Icon> Back </Button>
            {this.postInstallPanel()}
            {this.tryAgainButton()}
          </Step.Group>
        </Segment>
      </Container>
    );
  }

  tryAgainButton(): JSX.Element | undefined {
    if (this.props.succeeded) {
      return undefined;
    }
    return (<Button primary onClick={() => this.tryAgain()}>Try Again</Button>);
  }

  outputPanel(): JSX.Element | undefined  {
    if (this.props.output) {
      return (<Message info>{...this.asHTMLLines(this.props.output)}</Message>);
    }
    return undefined;
  }

  errorPanel(): JSX.Element | undefined  {
    if (this.props.error) {
      return (<Message error>{...this.asHTMLLines(this.props.error)}</Message>);
    }
    return undefined;
  }

  asHTMLLines(text: string): JSX.Element[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .map((l) => this.asHTMLLine(l));
  }

  asHTMLLine(text: string): JSX.Element {
    return (<p>{text}</p>);
  }

  postInstallPanel(): JSX.Element | undefined {
    const html = getPostInstallHtml(this.props.succeeded);
    if (html) {
      return (
        <Segment raised>
          (<Message info={this.props.succeeded} error={!this.props.succeeded}><div dangerouslySetInnerHTML={{__html: html}} /></Message>)
        </Segment>
      );
    }
    return undefined;
  }

  private goBack(): void {
    this.props.parent.setState({ action: null });
  }

  private tryAgain(): void {
    // TODO: save parameters and credentials
    this.props.parent.setState({ action: 'install', state: { bundleManifest: this.props.bundleManifest } });
  }
}

function getPostInstallHtml(succeeded: boolean): string | undefined {
  const postInstallItem = tryLoadPostInstallItem(succeeded ? 'succeeded' : 'failed');
  return postInstallItem.html;
}

function tryLoadPostInstallItem(outcome: string): PostInstallItem {
  try {
    const html = require(`../../data/postinstall.${outcome}.html`);
    if (html) {
      return { html };
    }
  } catch {
    // ignore
  }

  return { html: undefined };
}
