const { configure } = require('enzyme');
// tslint:disable-next-line:variable-name
const Adapter = require('enzyme-adapter-react-16');

configure({ adapter: new Adapter() });
