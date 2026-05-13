from bmt import Toolkit
import structlog

logger = structlog.get_logger()

NODE_CATEGORIES = [
    "biolink:Disease",
    "biolink:Drug",
    "biolink:Gene",
    "biolink:PhenotypicFeature",
    "biolink:BiologicalProcess",
    "biolink:Pathway",
    "biolink:ChemicalEntity",
    "biolink:Protein",
    "biolink:AnatomicalEntity",
    "biolink:Cell",
    "biolink:CellularComponent",
    "biolink:MolecularActivity",
    "biolink:GrossAnatomicalStructure",
]

PREDICATES = [
    "biolink:treats",
    "biolink:affects",
    "biolink:regulates",
    "biolink:associated_with",
    "biolink:active_in",
    "biolink:actively_involved_in",
    "biolink:acts_upstream_of",
    "biolink:acts_upstream_of_negative_effect",
    "biolink:acts_upstream_of_or_within_negative_effect",
    "biolink:acts_upstream_of_or_within_positive_effect",
    "biolink:acts_upstream_of_positive_effect",
    "biolink:affects_response_to",
    "biolink:ameliorates",
    "biolink:binds",
    "biolink:capable_of",
    "biolink:catalyzes",
    "biolink:causes",
    "biolink:coexists_with",
    "biolink:coexpressed_with",
    "biolink:colocalizes_with",
    "biolink:composed_primarily_of",
    "biolink:contraindicated_for",
    "biolink:contributes_to",
    "biolink:correlated_with",
    "biolink:decreases_response_to",
    "biolink:derives_from",
    "biolink:develops_from",
    "biolink:directly_physically_interacts_with",
    "biolink:disease_has_basis_in",
    "biolink:disrupts",
    "biolink:expressed_in",
    "biolink:gene_associated_with_condition",
    "biolink:gene_product_of",
    "biolink:genetically_associated_with",
    "biolink:genetically_interacts_with",
    "biolink:has_adverse_event",
    "biolink:has_input",
    "biolink:has_output",
    "biolink:has_part",
    "biolink:has_participant",
    "biolink:has_phenotype",
    "biolink:homologous_to",
    "biolink:in_taxon",
    "biolink:increases_response_to",
    "biolink:is_frameshift_variant_of",
    "biolink:is_missense_variant_of",
    "biolink:is_nearby_variant_of",
    "biolink:is_non_coding_variant_of",
    "biolink:is_nonsense_variant_of",
    "biolink:is_splice_site_variant_of",
    "biolink:is_synonymous_variant_of",
    "biolink:located_in",
    "biolink:negatively_correlated_with",
    "biolink:occurs_in",
    "biolink:overlaps",
    "biolink:physically_interacts_with",
    "biolink:positively_correlated_with",
    "biolink:precedes",
    "biolink:produces",
    "biolink:related_to",
    "biolink:similar_to",
    "biolink:subclass_of",
]


class BiolinkService:
    def __init__(self):
        self._associations: dict[str, list[str]] | None = None
        self._toolkit: Toolkit | None = None

    def _get_toolkit(self) -> Toolkit:
        if self._toolkit is None:
            self._toolkit = Toolkit()
        return self._toolkit

    def build_associations(self) -> dict[str, list[str]]:
        if self._associations is not None:
            return self._associations

        logger.info("building_biolink_associations")
        tk = self._get_toolkit()
        associations: dict[str, list[str]] = {}

        for subj in NODE_CATEGORIES:
            for obj in NODE_CATEGORIES:
                valid = [p for p in PREDICATES if tk.validate_edge(subj, p, obj)]
                if valid:
                    associations[f"{subj}|{obj}"] = valid

        logger.info(
            "biolink_associations_built",
            pairs=len(associations),
            total_triples=sum(len(v) for v in associations.values()),
        )
        self._associations = associations
        return associations

    def get_associations(self) -> dict[str, list[str]]:
        return self.build_associations()


biolink_service = BiolinkService()
