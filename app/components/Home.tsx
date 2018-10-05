import * as React from 'react';
import Bundle from './Bundle';

const styles = require('./Home.scss');

export default class Home extends React.Component {
  render() {
    return (
      <div>
        <div className={styles.container} data-tid="container">
            <h2>Hello Duffle</h2>
            <Bundle />
        </div>
      </div>
    );
  }
}
