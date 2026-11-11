data "oci_identity_compartment" "app" {
  id = var.compartment_ocid
}

data "oci_identity_availability_domains" "all" {
  compartment_id = var.tenancy_ocid
}

output "compartment_name" {
  value = data.oci_identity_compartment.app.name
}

output "availability_domains" {
  value = data.oci_identity_availability_domains.all.availability_domains[*].name
}

# Writes the cluster's access settings into ~/.kube/config and makes it the current context.
output "kubeconfig_command" {
  value = "oci ce cluster create-kubeconfig --cluster-id ${oci_containerengine_cluster.main.id} --file $HOME/.kube/config --region ${var.region} --token-version 2.0.0 --kube-endpoint PUBLIC_ENDPOINT"
}
