(function() {
  'use strict';

  angular.module('app.components')
    .factory('BlueprintDetailsModal', BlueprintDetailsFactory);

  /** @ngInject */
  function BlueprintDetailsFactory($modal) {
    var modalOpen = false;
    var modalBlueprint = {
      showModal: showModal
    };

    return modalBlueprint;

    function showModal(action, blueprintId) {
      var modalOptions = {
        templateUrl: 'app/components/blueprint-details-modal/blueprint-details-modal.html',
        controller: BlueprintDetailsModalController,
        controllerAs: 'vm',
        resolve: {
          action: resolveAction,
          blueprintId: resolveBlueprintId,
          serviceCatalogs: resolveServiceCatalogs,
          serviceDialogs: resolveServiceDialogs,
          tenants: resolveTenants
        }
      };

      var modal = $modal.open(modalOptions);

      return modal.result;

      function resolveBlueprintId() {
        return blueprintId;
      }

      function resolveAction() {
        return action;
      }

      function resolveServiceCatalogs(CollectionsApi) {
        var options = {
          mock: true,
          expand: 'resources',
          sort_by: 'name',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_catalogs', options);
      }

      function resolveServiceDialogs(CollectionsApi) {
        var options = {
          mock: true,
          expand: 'resources',
          attributes: ['id', 'description'],
          sort_by: 'description',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_dialogs', options);
      }

      function resolveTenants(CollectionsApi) {
        var options = {
          mock: true,
          expand: 'resources',
          attributes: ['id', 'name'],
          sort_by: 'name',
          sort_options: 'ignore_case'
        };

        return CollectionsApi.query('tenants', options);
      }
    }
  }

  /** @ngInject */
  function BlueprintDetailsModalController(action, blueprintId, BlueprintsState, jQuery, serviceCatalogs, serviceDialogs, tenants, $state, // jshint ignore:line
                                           BrowseEntryPointModal, $modalInstance, CollectionsApi, Notifications, sprintf) {                         // jshint ignore:line
    var vm = this;

    vm.blueprint = BlueprintsState.getBlueprintById(blueprintId);

    if (action === 'create') {
      vm.modalTitle = __('Create Blueprint');
      vm.modalBtnPrimaryLabel  = __('Create');
    } else if(action == 'publish') {
      vm.modalTitle = __('Publish ') + vm.blueprint.name;
      vm.modalBtnPrimaryLabel  = __('Publish');
    } else {
      vm.modalTitle = __('Edit Blueprint Details');
      vm.modalBtnPrimaryLabel  = __('Save');
    }

    vm.serviceCatalogs = serviceCatalogs.resources;

    vm.serviceDialogs = serviceDialogs.resources;

    vm.visibilityOptions = [{
      id: 800,
      name: 'Private'
    }, {
      id: 900,
      name: 'Public'
    }];
    vm.visibilityOptions = vm.visibilityOptions.concat(tenants.resources);

    vm.saveBlueprintDetails = saveBlueprintDetails;
    vm.cancelBlueprintDetails = cancelBlueprintDetails;
    vm.isCatalogUnassigned = isCatalogUnassigned;
    vm.catalogChanged = catalogChanged;
    vm.isCatalogRequired = isCatalogRequired;
    vm.isDialogRequired = isDialogRequired;
    vm.selectEntryPoint = selectEntryPoint;

    vm.modalData = {
      'action': action,
      'resource': {
        'name': vm.blueprint.name || __('Untitled Blueprint ') + BlueprintsState.getNextUniqueId(),
        'visibility': vm.blueprint.visibility,
        'catalog': vm.blueprint.catalog,
        'dialog': vm.blueprint.dialog,
        'provEP':  vm.blueprint.provEP,
        'reConfigEP': vm.blueprint.reConfigEP,
        'retireEP': vm.blueprint.retireEP
      }
    };

    if (!vm.modalData.resource.visibility) {
      vm.modalData.resource.visibility = vm.visibilityOptions[0];
    } else {
      vm.modalData.resource.visibility = vm.visibilityOptions[
            findWithAttr(vm.visibilityOptions, 'id', vm.modalData.resource.visibility.id)
          ];
    }

    if (!vm.modalData.resource.catalog) {
      vm.modalData.resource.catalog = vm.serviceCatalogs[0];
    } else {
      vm.modalData.resource.catalog = vm.serviceCatalogs[ findWithAttr(vm.serviceCatalogs, 'id', vm.modalData.resource.catalog.id) ];
    }

    if (!vm.modalData.resource.dialog) {
      vm.modalData.resource.dialog = vm.serviceDialogs[0];
    } else {
      vm.modalData.resource.dialog = vm.serviceDialogs[ findWithAttr(vm.serviceDialogs, 'id', vm.modalData.resource.dialog.id) ];
    }

    activate();

    function activate() {
    }

    function findWithAttr(array, attr, value) {
      for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
          return i;
        }
      }
    }

    function isCatalogUnassigned() {
      return vm.modalData.resource.catalog === null;
    }

    function isCatalogRequired() {
      return  (action === 'publish') && isCatalogUnassigned();
    }

    function isDialogRequired() {
      return  (action === 'publish') && (vm.modalData.resource.dialog === null);
    }

    function catalogChanged() {
      if(isCatalogUnassigned()){
        vm.modalData.resource.provEP = '';
        vm.modalData.resource.reConfigEP = '';
        vm.modalData.resource.retireEP = '';
        jQuery('#advOps').removeClass('in');
        jQuery('#advOpsHref').toggleClass('collapsed');
      }
    }

    function selectEntryPoint(entryPointType){

      var modalInstance = BrowseEntryPointModal.showModal(entryPointType);

      modalInstance.then(function (opts) {
        if(entryPointType === 'provisioning') {
          vm.modalData.resource.provEP = opts.entryPointData;
        } else if(entryPointType === 'reconfigure') {
          vm.modalData.resource.reConfigEP = opts.entryPointData;
        } else if(entryPointType === 'retirement') {
          vm.modalData.resource.retireEP =  opts.entryPointData;
        }
      });
    }

    function cancelBlueprintDetails() {
      $modalInstance.close();
      $state.go($state.current, {}, {reload: true});
    }

    function saveBlueprintDetails() {
      //CollectionsApi.post('Blueprints', vm.Blueprint.id, {}, vm.modalData).then(saveSuccess, saveFailure);

      if(action == 'publish') {
        vm.blueprint.published = new Date();
      }

      vm.blueprint.id = blueprintId;
      vm.blueprint.name = vm.modalData.resource.name;

      vm.blueprint.visibility = vm.modalData.resource.visibility;
      vm.blueprint.catalog = vm.modalData.resource.catalog;
      vm.blueprint.dialog = vm.modalData.resource.dialog;

      vm.blueprint.provEP = vm.modalData.resource.provEP;
      vm.blueprint.reConfigEP = vm.modalData.resource.reConfigEP;
      vm.blueprint.retireEP = vm.modalData.resource.retireEP;

      BlueprintsState.saveBlueprint(vm.blueprint);
      saveSuccess();

      function saveSuccess() {
        $modalInstance.close();
        if (action === 'create') {
          Notifications.success(sprintf(__('%s was created.'), vm.blueprint.name));
          $state.go('blueprints.designer', {blueprintId: vm.blueprint.id});
        } else if (action === 'edit' || action === 'publish') {
          Notifications.success(sprintf(__('%s was updated.'), vm.blueprint.name));
          $state.go($state.current, {}, {reload: true});
        }
      }

      function saveFailure() {
        Notifications.error(__('There was an error saving this Blueprint.'));
      }
    }
  }
})();
