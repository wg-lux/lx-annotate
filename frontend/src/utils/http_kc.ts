import axios from 'axios'
import Cookies from 'js-cookie'

export function initHttpKC() {
  axios.defaults.withCredentials = true
  const csrftoken = Cookies.get('csrftoken')
  if (csrftoken) {
    axios.defaults.headers.common['X-CSRFToken'] = csrftoken
  }

  axios.interceptors.response.use(
    (resp) => resp,
    (error: unknown) => {
      const status = axios.isAxiosError<unknown>(error) ? error.response?.status : undefined
      if (status === 401) {
        const next = encodeURIComponent(location.pathname + location.search)
        window.location.href = `/oidc/authenticate/?next=${next}`
      }
      return Promise.reject(
        error instanceof Error
          ? error
          : Object.assign(new Error('HTTP response interceptor rejected a non-Error value'), {
              cause: error
            })
      )
    }
  )
}
