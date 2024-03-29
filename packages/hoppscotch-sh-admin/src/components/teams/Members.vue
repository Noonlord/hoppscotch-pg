<template>
  <div class="flex flex-col">
    <div class="flex flex-col">
      <div class="flex">
        <HoppButtonPrimary
          :icon="IconUserPlus"
          :label="t('teams.add_members')"
          filled
          @click="showInvite = !showInvite"
        />
      </div>

      <div class="border rounded border-divider my-8">
        <HoppSmartPlaceholder
          v-if="team?.teamMembers?.length === 0"
          text="No members in this team. Add members to this team to collaborate"
        >
          <template #body>
            <HoppButtonSecondary
              :icon="IconUserPlus"
              :label="t('teams.add_members')"
              @click="
                () => {
                  showInvite = !showInvite;
                }
              "
            />
          </template>
        </HoppSmartPlaceholder>
        <div v-else class="divide-y divide-dividerLight">
          <div
            v-for="(member, index) in membersList"
            :key="`member-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              class="flex flex-1 px-4 py-3 bg-transparent"
              placeholder="Email"
              :name="'param' + index"
              :value="member.email"
              readonly
            />
            <span>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions![index].focus()"
              >
                <span class="relative">
                  <input
                    class="flex flex-1 px-4 py-3 bg-transparent cursor-pointer"
                    placeholder="Permissions"
                    :name="'value' + index"
                    :value="member.role"
                    readonly
                  />
                  <span
                    class="absolute right-4 top-1/2 transform !-translate-y-1/2"
                  >
                    <IconChevronDown />
                  </span>
                </span>
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      label="OWNER"
                      :icon="
                        member.role === 'OWNER' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'OWNER'"
                      @click="
                        () => {
                          updateMemberRole(member.userID, TeamMemberRole.Owner);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="EDITOR"
                      :icon="
                        member.role === 'EDITOR' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'EDITOR'"
                      @click="
                        () => {
                          updateMemberRole(
                            member.userID,
                            TeamMemberRole.Editor
                          );
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="VIEWER"
                      :icon="
                        member.role === 'VIEWER' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'VIEWER'"
                      @click="
                        () => {
                          updateMemberRole(
                            member.userID,
                            TeamMemberRole.Viewer
                          );
                          hide();
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
            <div class="flex">
              <HoppButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                :title="t('teams.remove')"
                :icon="IconUserMinus"
                color="red"
                :loading="isLoadingIndex === index"
                @click="removeExistingTeamMember(member.userID, index)"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!fetching && !team" class="flex flex-col items-center">
        <icon-lucide-help-circle class="mb-4 svg-icons" />
        {{ t('teams.error') }}
      </div>
    </div>

    <div class="flex">
      <HoppButtonPrimary
        :label="t('teams.save')"
        outline
        @click="saveUpdatedTeam"
      />
    </div>
    <TeamsInvite
      :show="showInvite"
      :editingTeamID="route.params.id.toString()"
      @member="updateMembers"
      @hide-modal="
        () => {
          showInvite = false;
        }
      "
    />
  </div>
</template>

<script setup lang="ts">
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCircle from '~icons/lucide/circle';
import IconUserPlus from '~icons/lucide/user-plus';
import IconUserMinus from '~icons/lucide/user-minus';
import IconChevronDown from '~icons/lucide/chevron-down';
import { useClientHandle, useMutation } from '@urql/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from '~/composables/toast';
import {
  ChangeUserRoleInTeamByAdminDocument,
  TeamInfoDocument,
  TeamMemberRole,
  RemoveUserFromTeamByAdminDocument,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';
import { HoppButtonPrimary, HoppButtonSecondary } from '@hoppscotch/ui';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();

const emit = defineEmits<{
  (e: 'update-team'): void;
}>();

// Used to Invoke the Invite Members Modal
const showInvite = ref(false);

// Get Team Details
const team = ref<TeamInfoQuery['infra']['teamInfo'] | undefined>();
const fetching = ref(true);
const route = useRoute();
const { client } = useClientHandle();

const getTeamInfo = async () => {
  fetching.value = true;
  const result = await client
    .query(TeamInfoDocument, { teamID: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    return toast.error(`${t('teams.load_info_error')}`);
  }
  if (result.data?.infra.teamInfo) {
    team.value = result.data.infra.teamInfo;
  }
  fetching.value = false;
};

onMounted(async () => await getTeamInfo());
onUnmounted(() => emit('update-team'));

// Update members tab after a change in the members list or member roles
const updateMembers = () => {
  getTeamInfo();
  emit('update-team');
};

// Template refs
const tippyActions = ref<any | null>(null);

const roleUpdates = ref<
  {
    userID: string;
    role: TeamMemberRole;
  }[]
>([]);

watch(
  () => team.value,
  (teamDetails) => {
    const members = teamDetails?.teamMembers ?? [];

    // Remove deleted members
    roleUpdates.value = roleUpdates.value.filter(
      (update) =>
        members.findIndex(
          (y: { user: { uid: string } }) => y.user.uid === update.userID
        ) !== -1
    );
  }
);

// Update the role of the member selected in the UI
const updateMemberRole = (userID: string, role: TeamMemberRole) => {
  const updateIndex = roleUpdates.value.findIndex(
    (item) => item.userID === userID
  );
  if (updateIndex !== -1) {
    // Role Update exists
    roleUpdates.value[updateIndex].role = role;
  } else {
    // Role Update does not exist
    roleUpdates.value.push({
      userID,
      role,
    });
  }
};

// Obtain the list of members in the team
const membersList = computed(() => {
  if (!team.value) return [];
  const members = (team.value.teamMembers ?? []).map((member) => {
    const updatedRole = roleUpdates.value.find(
      (update) => update.userID === member.user.uid
    );

    return {
      userID: member.user.uid,
      email: member.user.email!,
      role: updatedRole?.role ?? member.role,
    };
  });

  return members;
});

// Change the role of the selected user in the team
const changeUserRoleInTeamMutation = useMutation(
  ChangeUserRoleInTeamByAdminDocument
);
const changeUserRoleInTeam = (
  userUID: string,
  teamID: string,
  newRole: TeamMemberRole
) => {
  return changeUserRoleInTeamMutation.executeMutation({
    userUID,
    teamID,
    newRole,
  });
};

// Save the updates done to the team
const isLoading = ref(false);

const saveUpdatedTeam = async () => {
  isLoading.value = true;
  roleUpdates.value.forEach(async (update) => {
    if (!team.value) return;
    const updateMemberRoleResult = await changeUserRoleInTeam(
      update.userID,
      team.value.id,
      update.role
    );
    if (updateMemberRoleResult.error) {
      toast.error(`${t('state.role_update_failed')}`);
      roleUpdates.value = [];
    } else {
      toast.success(`${t('state.role_update_success')}`);
      roleUpdates.value = [];
    }
    isLoading.value = false;
  });
};

// Remove user from the team mutation
const removeUserFromTeamMutation = useMutation(
  RemoveUserFromTeamByAdminDocument
);
const removeUserFromTeam = (userUid: string, teamID: string) => {
  return () =>
    removeUserFromTeamMutation.executeMutation({
      userUid,
      teamID,
    });
};

// Remove a team member from the team
const isLoadingIndex = ref<null | number>(null);

const removeExistingTeamMember = async (userID: string, index: number) => {
  if (!team.value) return;
  isLoadingIndex.value = index;
  const removeTeamMemberResult = await removeUserFromTeam(
    userID,
    team.value.id
  )();
  if (removeTeamMemberResult.error) {
    toast.error(`${t('state.remove_member_failure')}`);
  } else {
    team.value.teamMembers = team.value.teamMembers?.filter(
      (member: any) => member.user.uid !== userID
    );
    toast.success(`${t('state.remove_member_success')}`);
  }
  isLoadingIndex.value = null;
  emit('update-team');
};
</script>
