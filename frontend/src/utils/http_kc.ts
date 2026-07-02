import axios from 'axios'
import Cookies from 'js-cookie'

export function initHttpKC() {
  axios.defaults.withCredentials = true
  const csrftoken = Cookies.get('csrftoken')
  if (csrftoken) axios.defaults.headers.common['X-CSRFToken'] = csrftoken

  axios.interceptors.response.use(
    (resp) => resp,
    (error) => {
      const status = error?.response?.status
      if (status === 401) {
        const next = encodeURIComponent(location.pathname + location.search)
        window.location.href = `/oidc/authenticate/?next=${next}`
        return
      }
      return Promise.reject(error)
    }
  )
}
