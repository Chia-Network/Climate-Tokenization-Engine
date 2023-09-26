const { expect } = require('chai');
const sinon = require('sinon');

describe.skip('Sample Test Suite', () => {
  it('should pass this sample test', () => {
    expect(true).to.equal(true);
  });

  it('should demonstrate a spy', () => {
    const myFunction = sinon.spy();
    myFunction();
    expect(myFunction.calledOnce).to.be.true;
  });
});
