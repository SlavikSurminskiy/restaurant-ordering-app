# Kubernetes cluster (OKE) and its worker nodes. Everything here stays inside Always Free:
# a BASIC cluster (the ENHANCED type is paid) and Ampere A1 nodes with 2 OCPU / 12 GB in total.

locals {
  kubernetes_version = "v1.36.4"

  # Two nodes of 1 OCPU / 6 GB = the whole Always Free A1 allowance. Changing these values to
  # more than 2 OCPU / 12 GB in total costs money.
  node_count  = 2
  node_ocpus  = 1
  node_memory = 6

  # Oracle-Linux-9.8-aarch64-2026.10.16-0-OKE-1.36.4-2067 in eu-frankfurt-1: an ARM image with
  # kubelet for kubernetes_version. OCIDs differ per region, and Oracle removes old images after a
  # few months. To find a newer one (ARM, "-OKE-<version>-", no GPU):
  #   oci ce node-pool-options get --node-pool-option-id all --compartment-id <tenancy OCID>
  node_image_id = "ocid1.image.oc1.eu-frankfurt-1.aaaaaaaaosjko5acivfa6zsfzcghkwit7p6z53gvbpcag42mgwrjks26jdva"
}

resource "oci_containerengine_cluster" "main" {
  compartment_id     = var.compartment_ocid
  name               = "restaurant"
  kubernetes_version = local.kubernetes_version
  vcn_id             = oci_core_vcn.main.id
  type               = "BASIC_CLUSTER"

  # The Kubernetes API: a network card in our subnet with a public IP, for kubectl.
  endpoint_config {
    subnet_id            = oci_core_subnet.main.id
    is_public_ip_enabled = true
  }

  # Pods get addresses from a virtual range inside the cluster, not from the subnet.
  cluster_pod_network_options {
    cni_type = "FLANNEL_OVERLAY"
  }

  options {
    # Where load balancers for `type: LoadBalancer` Services are created.
    service_lb_subnet_ids = [oci_core_subnet.lb.id]
  }
}

resource "oci_containerengine_node_pool" "main" {
  compartment_id     = var.compartment_ocid
  cluster_id         = oci_containerengine_cluster.main.id
  name               = "restaurant"
  kubernetes_version = local.kubernetes_version

  node_shape = "VM.Standard.A1.Flex"
  node_shape_config {
    ocpus         = local.node_ocpus
    memory_in_gbs = local.node_memory
  }

  node_source_details {
    source_type             = "IMAGE"
    image_id                = local.node_image_id
    boot_volume_size_in_gbs = 50 # the minimum; counts toward the free 200 GB
  }

  node_config_details {
    size = local.node_count

    # One entry per availability domain: OKE places nodes where A1 capacity is free.
    dynamic "placement_configs" {
      for_each = data.oci_identity_availability_domains.all.availability_domains
      content {
        availability_domain = placement_configs.value.name
        subnet_id           = oci_core_subnet.main.id
      }
    }

    node_pool_pod_network_option_details {
      cni_type = "FLANNEL_OVERLAY"
    }
  }
}
