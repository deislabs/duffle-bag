import * as React from 'react';

const styles = require('./Home.scss');
const bundle = require('../../data/bundle.json');

export default class Bundle extends React.Component {
  render() {
    return (
      <div>
        <div className={styles.container} data-tid="container">
            <h2>Welcome to {bundle.name}</h2>
        </div>
      </div>
    );
  }
}
