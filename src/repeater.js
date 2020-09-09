import { graphQLClient } from './graphql'
import { parse as durationParse } from 'iso8601-duration'
import {
  create as createQuery,
  jobs as jobsQuery,
  job as jobQuery,
} from './queries'
import { JobError, JobsError, CreateError, ParameterError } from './errors'
import { merge } from './utility'
import Job from './types/job'

export const API_ENDPOINT = 'https://api.repeater.dev/graphql'

export const VERBS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]

export const requiredParams = {
  token: {
    required: 'is required',
  },
  name: {
    required: 'is required',
  },
  verb: {
    required: `must be one of ${VERBS.join(' | ')}`,
  },
  endpoint: {
    required: 'is required',
    format: 'must look like a URL',
  },
  runAt: {
    format: 'must be a Date',
  },
  runEvery: {
    format: 'must be an ISO8601 Duration string',
  },
}

const DEFAULT_OPTIONS = {
  endpoint: API_ENDPOINT,
}

export class Repeater {
  constructor(token, options = {}) {
    this.setToken(token)
    this.setOptions(options)
    this._initVariables()
    this._initClient()
    this.defaultVariables = {
      enabled: true,
      retryable: true,
      runAt: new Date(),
    }
  }

  async enqueue(params = {}) {
    // this.setVariables(params)
    // this.validate()
    const variables = merge(this.defaultVariables, params)

    try {
      const data = await this.client.request(createQuery, variables)
      return new Job(data.job, { token: this.token, ...this.options })
    } catch (error) {
      return new CreateError(error.message)
    }
  }

  async jobs() {
    try {
      const data = await this.client.request(jobsQuery)
      return data.jobs.map((job) => {
        return new Job(job, { token: this.token, ...this.options })
      })
    } catch (error) {
      return new JobsError(error.message)
    }
  }

  async job(name) {
    try {
      const data = await this.client.request(jobQuery, { name })
      if (data.job) {
        return new Job(data.job, { token: this.token, ...this.options })
      } else {
        return null
      }
    } catch (error) {
      return new JobError(error.message)
    }
  }

  setToken(token) {
    if (!token) throw new ParameterError('token', requiredParams.token.required)

    this.token = token
  }

  setOptions(options) {
    this.options = merge(DEFAULT_OPTIONS, options)
  }

  setVariables(params) {
    this.variables = merge(this.variables, this._normalizeParams(params))
  }

  _initClient() {
    this.client = graphQLClient(this.token, this.options)
  }

  _initVariables() {
    this.variables = {
      enabled: true,
      retryable: true,
      runAt: new Date(),
    }
  }

  validate() {
    if (!this.variables.name) {
      throw new ParameterError('name', requiredParams.name.required)
    }
    if (!VERBS.includes(this.variables?.verb?.toUpperCase())) {
      throw new ParameterError('verb', requiredParams.verb.required)
    }
    if (!this.variables.endpoint) {
      throw new ParameterError('endpoint', requiredParams.endpoint.required)
    }
    if (!this.variables.endpoint.match(/^https?:\/\//)) {
      throw new ParameterError('endpoint', requiredParams.endpoint.format)
    }
    if (
      this.variables.runAt &&
      Object.prototype.toString.call(this.variables.runAt) !== '[object Date]'
    ) {
      throw new ParameterError('runAt', requiredParams.runAt.format)
    }
    if (this.variables.runEvery) {
      try {
        durationParse(this.variables.runEvery)
      } catch (e) {
        throw new ParameterError('runEvery', requiredParams.runEvery.format)
      }
    }
  }

  _normalizeParams(params) {
    const jsonHeader = { 'Content-Type': 'application/json' }

    const normalizedParams = merge(this.variables, {
      name: params.name,
      enabled: params.enabled,
      endpoint: params.endpoint,
      verb: params.verb,
      headers: params.headers,
      body: params.body,
      retryable: params.retryable,
      runAt: params.runAt,
      runEvery: params.runEvery,
    })

    normalizedParams.verb = normalizedParams.verb?.toUpperCase()

    if (!normalizedParams.body) {
      if (params.json) {
        normalizedParams.body = JSON.stringify(params.json)
        normalizedParams.headers = normalizedParams.headers
          ? merge(normalizedParams.headers, jsonHeader)
          : jsonHeader
      } else {
        delete normalizedParams.body
      }
    }

    if (typeof normalizedParams.headers === 'object') {
      normalizedParams.headers = JSON.stringify(normalizedParams.headers)
    }

    return normalizedParams
  }
}
