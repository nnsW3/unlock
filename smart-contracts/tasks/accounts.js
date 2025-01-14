const { task } = require('hardhat/config')

task('accounts', 'Prints the list of accounts', async () => {
  // eslint-disable-next-line no-undef
  const accounts = await ethers.getSigners()

  accounts.forEach((account, i) => {
    console.log(`[${i}]: ${account.address}`)
  })
})
