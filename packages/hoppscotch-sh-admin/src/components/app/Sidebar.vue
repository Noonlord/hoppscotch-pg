<template>
  <div class="flex">
    <!-- Backdrop -->
    <div
      :class="isOpen ? 'block' : 'hidden'"
      @click="isOpen = false"
      class="fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden"
    ></div>
    <!-- End Backdrop -->

    <div
      :class="isOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'"
      class="flex fixed inset-y-0 left-0 z-30 overflow-y-auto transition duration-300 transform bg-neutral-200 dark:bg-neutral-900 lg:translate-x-0 lg:static lg:inset-0 border-r border-gray-300 dark:border-gray-600"
    >
      <div :class="isExpanded ? 'w-64' : 'w-full'">
        <div class="flex items-center justify-start mt-6 ml-6">
          <div class="flex items-center">
            <router-link class="flex" to="/dashboard">
              <img src="/public/cover.jpg" alt="" class="h-7" />

              <span
                v-if="isExpanded"
                class="mx-2 text-xl font-semibold text-gray-600 dark:text-gray-200"
                >Hoppscotch</span
              >
            </router-link>
          </div>
        </div>

        <nav class="mt-10">
          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4"
            :class="[route.name === '/dashboard' ? activeClass : inactiveClass]"
            to="/dashboard"
          >
            <icon-lucide-layout-dashboard
              class="text-xl"
              :class="route.name === '/dashboard' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4">Dashboard</span>
          </router-link>

          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4 rounded-sm"
            :class="[route.name === 'User' ? activeClass : inactiveClass]"
            to="/users"
          >
            <icon-lucide-user
              class="text-xl"
              :class="route.path === '/users' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4">Users</span>
          </router-link>

          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4 rounded-sm"
            :class="[route.name === '/teams' ? activeClass : inactiveClass]"
            to="/teams"
          >
            <icon-lucide-users
              class="text-xl"
              :class="route.name === '/teams' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4">Teams</span>
          </router-link>

          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4 rounded-sm"
            :class="[route.name === '/settings' ? activeClass : inactiveClass]"
            to="/settings"
          >
            <icon-lucide-settings
              class="text-xl"
              :class="route.name === '/settings' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4">Settings</span>
          </router-link>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../../composables/useSidebar';
import { useRoute } from 'vue-router';

const { isOpen, isExpanded } = useSidebar();

const route = useRoute();

const activeClass =
  'bg-gray-600 bg-opacity-25 text-gray-100 border-gray-100 border-emerald-600';
const inactiveClass =
  'border-gray-900 text-gray-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100';
</script>