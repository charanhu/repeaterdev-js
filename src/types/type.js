import { graphQLClient } from '../graphql'

export default class Type {
  constructor(data, { token, ...options }) {
    this.setToken(token)
    this.setOptions(options)
    this.parse(data)
    this._initClient()
  }

  setToken(token) {
    this.token = token
  }

  setOptions(options) {
    this.options = options
  }

  parse(data) {
    this.data = data
  }

  _reinitialize(data) {
    this.parse(data)
  }

  _initClient() {
    this.client = graphQLClient(this.token, this.options)
  }
}