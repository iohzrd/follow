<template>
  <div id="app">{{ cid }}</div>
</template>
<script>
export default {
  name: "Comments",
  props: {
    cid: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {};
  },
  watch: {},
  mounted: function() {},
  methods: {}
};
</script>
<style scoped></style>
