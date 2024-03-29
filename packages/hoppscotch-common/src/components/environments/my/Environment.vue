<template>
  <div
    class="group flex items-stretch"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <span
      v-if="environmentIndex === 'Global'"
      class="flex cursor-pointer items-center justify-center px-4"
      @click="emit('edit-environment')"
    >
      <icon-lucide-globe class="svg-icons" />
    </span>
    <span
      v-else
      class="flex cursor-pointer items-center justify-center px-4"
      @click="emit('edit-environment')"
    >
      <icon-lucide-layers class="svg-icons" />
    </span>
    <span
      class="flex min-w-0 flex-1 cursor-pointer py-2 pr-2 transition group-hover:text-secondaryDark"
      @click="emit('edit-environment')"
    >
      <span class="truncate">
        {{ environment.name }}
      </span>
    </span>
    <span>
      <tippy
        ref="options"
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions!.focus()"
      >
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.more')"
          :icon="IconMoreVertical"
        />
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            role="menu"
            @keyup.e="edit!.$el.click()"
            @keyup.d="duplicate!.$el.click()"
            @keyup.j="exportAsJsonEl!.$el.click()"
            @keyup.delete="
              !(environmentIndex === 'Global')
                ? deleteAction!.$el.click()
                : null
            "
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              ref="edit"
              :icon="IconEdit"
              :label="`${t('action.edit')}`"
              :shortcut="['E']"
              @click="
                () => {
                  emit('edit-environment')
                  hide()
                }
              "
            />
            <HoppSmartItem
              ref="duplicate"
              :icon="IconCopy"
              :label="`${t('action.duplicate')}`"
              :shortcut="['D']"
              @click="
                () => {
                  duplicateEnvironments()
                  hide()
                }
              "
            />
            <HoppSmartItem
              ref="exportAsJsonEl"
              :icon="IconEdit"
              :label="`${t('export.as_json')}`"
              :shortcut="['J']"
              @click="
                () => {
                  exportEnvironmentAsJSON()
                  hide()
                }
              "
            />
            <HoppSmartItem
              v-if="environmentIndex !== 'Global'"
              ref="deleteAction"
              :icon="IconTrash2"
              :label="`${t('action.delete')}`"
              :shortcut="['⌫']"
              @click="
                () => {
                  confirmRemove = true
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_environment')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script setup lang="ts">
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import { ref } from "vue"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import {
  deleteEnvironment,
  duplicateEnvironment,
  createEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { TippyComponent } from "vue-tippy"
import { HoppSmartItem } from "@hoppscotch/ui"
import { exportAsJSON } from "~/helpers/import-export/export/environment"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  environment: Environment
  environmentIndex: number | "Global" | null
}>()

const emit = defineEmits<{
  (e: "edit-environment"): void
}>()

const confirmRemove = ref(false)

const exportEnvironmentAsJSON = () => {
  const { environment, environmentIndex } = props
  exportAsJSON(environment, environmentIndex)
    ? toast.success(t("state.download_started"))
    : toast.error(t("state.download_failed"))
}

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)
const edit = ref<typeof HoppSmartItem>()
const duplicate = ref<typeof HoppSmartItem>()
const exportAsJsonEl = ref<typeof HoppSmartItem>()
const deleteAction = ref<typeof HoppSmartItem>()

const removeEnvironment = () => {
  if (props.environmentIndex === null) return
  if (props.environmentIndex !== "Global") {
    deleteEnvironment(props.environmentIndex, props.environment.id)
  }
  toast.success(`${t("state.deleted")}`)
}

const duplicateEnvironments = () => {
  if (props.environmentIndex === null) return
  if (props.environmentIndex === "Global") {
    createEnvironment(
      `Global - ${t("action.duplicate")}`,
      cloneDeep(getGlobalVariables())
    )
  } else duplicateEnvironment(props.environmentIndex)

  toast.success(`${t("environment.duplicated")}`)
}
</script>
