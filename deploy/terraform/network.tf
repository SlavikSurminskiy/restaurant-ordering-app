locals {
  vcn_cidr       = "10.0.0.0/16" # the whole network: 10.0.0.0 - 10.0.255.255
  subnet_cidr    = "10.0.0.0/24" # the Kubernetes API endpoint and the nodes: 10.0.0.0 - 10.0.0.255
  lb_subnet_cidr = "10.0.1.0/24" # load balancers of Kubernetes Services: 10.0.1.0 - 10.0.1.255
}

resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "restaurant"
  cidr_blocks    = [local.vcn_cidr]
  dns_label      = "restaurant"
}

resource "oci_core_subnet" "main" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  display_name      = "restaurant"
  cidr_block        = local.subnet_cidr
  dns_label         = "main"
  route_table_id    = oci_core_route_table.main.id
  security_list_ids = [oci_core_security_list.main.id]
}

# OKE doesn't let node pools use the subnet given for load balancers (service_lb_subnet_ids), so
# they get their own. Same route table and firewall.
resource "oci_core_subnet" "lb" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  display_name      = "restaurant-lb"
  cidr_block        = local.lb_subnet_cidr
  dns_label         = "lb"
  route_table_id    = oci_core_route_table.main.id
  security_list_ids = [oci_core_security_list.main.id]
}

# Everything that is not inside the VCN goes to the internet gateway.
resource "oci_core_route_table" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "restaurant"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# The way between the VCN and the internet, in both directions.
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "restaurant-internet"
}


# The firewall of the subnet (protocol "6" = TCP, "1" = ICMP).
resource "oci_core_security_list" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "restaurant"

  ingress_security_rules {
    description = "Anything inside the VCN: nodes, pods, the API endpoint, the load balancer"
    protocol    = "all"
    source      = local.vcn_cidr
  }
  ingress_security_rules {
    description = "kubectl"
    protocol    = "6"
    source      = "0.0.0.0/0"
    tcp_options {
      min = 6443
      max = 6443
    }
  }
  ingress_security_rules {
    description = "HTTP from the internet to the load balancer"
    protocol    = "6"
    source      = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }
  ingress_security_rules {
    description = "HTTPS from the internet to the load balancer"
    protocol    = "6"
    source      = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }
  ingress_security_rules {
    description = "Path MTU discovery (\"packet too big\" messages)"
    protocol    = "1"
    source      = "0.0.0.0/0"
    icmp_options {
      type = 3
      code = 4
    }
  }

  egress_security_rules {
    description = "Everything out: pulling images, OCI services, other nodes"
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

