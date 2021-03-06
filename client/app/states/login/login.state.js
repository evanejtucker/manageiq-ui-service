import templateUrl from './login.html'

/** @ngInject */
export function LoginState (routerHelper) {
  routerHelper.configureStates(getStates())
}

function getStates () {
  return {
    'login': {
      parent: 'blank',
      url: '/login',
      templateUrl,
      controller: StateController,
      controllerAs: 'vm',
      title: N_('Login'),
      data: {
        layout: 'blank'
      }
    }
  }
}

/** @ngInject */
function StateController (exception, $state, Text, RBAC, API_LOGIN, API_PASSWORD, AuthenticationApi, Session,
                          $rootScope, Notifications, Language, ApplianceInfo, $window) {
  const vm = this

  vm.text = Text.login
  vm.credentials = {
    login: API_LOGIN,
    password: API_PASSWORD
  }
  vm.onSubmit = onSubmit

  if ($window.location.href.includes('?timeout')) {
    Notifications.message('danger', '', __('Your session has timed out.'), true)
    Session.destroy()
  }

  if ($window.location.href.includes('?pause')) {
    const params = (new URL($window.document.location)).searchParams
    const pauseLength = params.get('pause')
    Session.setPause(pauseLength)
  }

  if (Session.privilegesError) {
    Notifications.error(__('User does not have privileges to login.'))
    Session.destroy()
  }

  function onSubmit () {
    Session.timeoutNotified = false
    Session.privilegesError = false

    return AuthenticationApi.login(vm.credentials.login, vm.credentials.password)
    .then(Session.loadUser)
    .then(Session.requestWsToken)
    .then((response) => {
      if (angular.isDefined(response)) {
        Language.onLogin(response)
        ApplianceInfo.set(response)
        RBAC.setRole(response.identity.role)
      }

      if (RBAC.suiAuthorized()) {
        if (angular.isDefined($rootScope.notifications) && $rootScope.notifications.data.length > 0) {
          $rootScope.notifications.data.splice(0, $rootScope.notifications.data.length)
        }
        $window.location.href = $state.href('dashboard')
      } else {
        Session.privilegesError = true
        Notifications.error(__('You do not have permission to view the Service UI. Contact your administrator to update your group permissions.'))
        Session.destroy()
      }
    })
    .catch(() => {
      exception.catch('Login failed, possibly invalid credentials.')
      Session.destroy()
    })
  }
}
