<template>
  <div v-if="post">
    <q-card flat bordered class="my-card">
      <q-card-section v-for="(value, key) in post" :key="key">
        <div v-if="key != 'identity'">{{ key }}: "{{ value }}"</div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script>
export default {
  name: "Post",
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {};
  },
  mounted: function() {
    console.log(this.post);
  },
  methods: {}
};
</script>
<style scoped></style>
