import * as React from 'react';
import { Container, Header, Message, Segment } from 'semantic-ui-react';

import { Actionable } from './contract';

interface Properties {
  readonly parent: React.Component<any, Actionable, any>;
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
          <Header as="h4">Installation {this.props.succeeded ? 'succeeded' : 'failed'}</Header>
        </Segment>
        <Segment raised>
          {this.outputPanel()}
          {this.errorPanel()}
        </Segment>
        {this.postInstallPanel()}
      </Container>
    );
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
