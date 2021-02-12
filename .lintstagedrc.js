module.exports = {
  '*.ts': ['prettier --write --list-different', 'eslint --fix --format=codeframe'],
  '!(*.ts)': 'prettier --write --list-different --ignore-unknown'
}
